
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  trial_end: string | null;
  is_trial_active: boolean;
  has_access: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  subscription: SubscriptionData | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  checkSubscription: () => Promise<void>;
  createCheckout: () => Promise<{ url?: string; error?: string }>;
  openCustomerPortal: () => Promise<{ url?: string; error?: string }>;
  sessionState: 'initializing' | 'authenticated' | 'unauthenticated';
  validateSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cache management
const CACHE_KEY = 'subscription_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedSubscription = (userId: string): SubscriptionData | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${userId}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log('AuthContext: Using cached subscription data');
        return data;
      }
    }
  } catch (error) {
    console.error('AuthContext: Error reading cache:', error);
  }
  return null;
};

const setCachedSubscription = (userId: string, data: SubscriptionData) => {
  try {
    localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('AuthContext: Error writing cache:', error);
  }
};

const clearSubscriptionCache = (userId?: string) => {
  try {
    if (userId) {
      localStorage.removeItem(`${CACHE_KEY}_${userId}`);
    } else {
      // Clear all subscription caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('AuthContext: Error clearing cache:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [sessionState, setSessionState] = useState<'initializing' | 'authenticated' | 'unauthenticated'>('initializing');
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number>(0);

  const validateSession = async (): Promise<Session | null> => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('AuthContext: Session validation error:', error);
        return null;
      }

      // Check if token needs refresh (refresh 5 minutes before expiry)
      if (currentSession?.expires_at) {
        const expiryTime = currentSession.expires_at * 1000;
        const now = Date.now();
        const refreshBuffer = 5 * 60 * 1000; // 5 minutes
        
        if (now >= (expiryTime - refreshBuffer)) {
          console.log('AuthContext: Token near expiry, refreshing...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('AuthContext: Token refresh failed:', refreshError);
            return null;
          }
          
          setLastTokenRefresh(Date.now());
          return refreshedSession;
        }
      }
      
      return currentSession;
    } catch (error) {
      console.error('AuthContext: Session validation failed:', error);
      return null;
    }
  };

  const checkSubscription = async (forceRefresh: boolean = false) => {
    // Validate session first
    const currentSession = await validateSession();
    
    if (!currentSession?.user) {
      console.log('AuthContext: No valid session, skipping subscription check');
      setSubscription(null);
      setSessionState('unauthenticated');
      return;
    }
    
    setSessionState('authenticated');
    
    // Prevent multiple concurrent calls with lock
    if (isCheckingSubscription) {
      console.log('AuthContext: Subscription check already in progress');
      return;
    }

    const userId = currentSession.user.id;
    
    // Try cache first unless forced refresh
    if (!forceRefresh) {
      const cached = getCachedSubscription(userId);
      if (cached) {
        setSubscription(cached);
        // Start background refresh but don't wait for it
        setTimeout(() => checkSubscription(true), 100);
        return;
      }
    }
    
    setIsCheckingSubscription(true);
    
    try {
      console.log('AuthContext: Checking subscription for user', currentSession.user.email);
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('AuthContext: Error checking subscription:', error);
        // Set a fallback subscription state instead of leaving it null
        setSubscription({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          trial_end: null,
          is_trial_active: false,
          has_access: false
        });
        return;
      }

      console.log('AuthContext: Subscription data received:', data);
      setSubscription(data);
      setCachedSubscription(userId, data);
    } catch (error) {
      console.error('AuthContext: Error checking subscription:', error);
      // Set fallback state on error
      setSubscription({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        trial_end: null,
        is_trial_active: false,
        has_access: false
      });
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const createCheckout = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) return { error: error.message };
      
      // Clear cache after checkout to force refresh
      clearSubscriptionCache(currentSession.user.id);
      
      return { url: data.url };
    } catch (error) {
      return { error: 'Failed to create checkout session' };
    }
  };

  const openCustomerPortal = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) return { error: error.message };
      return { url: data.url };
    } catch (error) {
      return { error: 'Failed to open customer portal' };
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing auth state');
    
    // Set up auth state listener FIRST with enhanced error handling
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session?.user?.email || 'no user');
        
        // Update state immediately (synchronous only)
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle different auth events
        if (session?.user) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('AuthContext: User authenticated, scheduling subscription check');
            setSessionState('authenticated');
            // Defer subscription check to avoid deadlock
            setTimeout(() => {
              checkSubscription(event === 'TOKEN_REFRESHED');
            }, 50);
          }
        } else {
          console.log('AuthContext: No session, clearing state');
          setSubscription(null);
          setSessionState('unauthenticated');
          clearSubscriptionCache();
        }
        
        // Set loading to false after first auth state change
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('AuthContext: Error getting initial session:', error);
      }
      
      console.log('AuthContext: Initial session check:', session?.user?.email || 'no user');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('AuthContext: Existing session found, checking subscription');
        // Use a small delay to ensure everything is initialized
        setTimeout(() => {
          checkSubscription(false);
        }, 200);
      } else {
        console.log('AuthContext: No existing session');
      }
      
      setLoading(false);
    });

    return () => {
      console.log('AuthContext: Cleaning up auth subscription');
      authSubscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('AuthContext: Attempting signup for:', email);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('AuthContext: Signup error:', error);
    } else {
      console.log('AuthContext: Signup successful');
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext: Attempting signin for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('AuthContext: Signin error:', error);
    } else {
      console.log('AuthContext: Signin successful');
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('AuthContext: Attempting signout');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('AuthContext: Signout error:', error);
    } else {
      console.log('AuthContext: Signout successful');
    }
    
    setSubscription(null);
    clearSubscriptionCache();
    return { error };
  };

  const value = {
    user,
    session,
    subscription,
    loading,
    signUp,
    signIn,
    signOut,
    checkSubscription: () => checkSubscription(true), // Expose force refresh
    createCheckout,
    openCustomerPortal,
    sessionState,
    validateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
