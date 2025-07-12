
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
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

  const checkSubscription = async (forceRefresh: boolean = false) => {
    // Get the current session directly instead of relying on state
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession?.user) {
      console.log('AuthContext: No current session, skipping subscription check');
      setSubscription(null);
      return;
    }
    
    // Prevent multiple concurrent calls
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
    const isMobile = Capacitor.isNativePlatform();
    console.log('📱 AuthContext: Initializing auth state', {
      platform: Capacitor.getPlatform(),
      isMobile,
      userAgent: navigator.userAgent
    });
    
    let mounted = true;
    let initTimeout: NodeJS.Timeout;
    
    // Longer timeout for mobile platforms due to potential network issues
    const timeoutDuration = isMobile ? 20000 : 15000;
    
    // Set timeout to prevent infinite loading
    initTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('📱 AuthContext: Initialization timeout, proceeding without auth');
        setLoading(false);
      }
    }, timeoutDuration);
    
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('AuthContext: Auth state changed:', event, session?.user?.email || 'no user');
        
        // Clear timeout on first auth event
        if (initTimeout) {
          clearTimeout(initTimeout);
          initTimeout = null as any;
        }
        
        // Update state immediately
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle subscription check after state update
        if (session?.user && event === 'SIGNED_IN') {
          console.log('AuthContext: User signed in, checking subscription');
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            if (mounted) checkSubscription(false);
          }, 100);
        } else if (!session) {
          console.log('AuthContext: No session, clearing subscription');
          setSubscription(null);
          clearSubscriptionCache();
        }
        
        // Set loading to false after auth state change
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('AuthContext: Error getting initial session:', error);
        setLoading(false);
        return;
      }
      
      console.log('AuthContext: Initial session check:', session?.user?.email || 'no user');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('AuthContext: Existing session found, checking subscription');
        setTimeout(() => {
          if (mounted) checkSubscription(false);
        }, 200);
      } else {
        console.log('AuthContext: No existing session');
      }
      
      setLoading(false);
      
      // Clear timeout since we got a response
      if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null as any;
      }
    }).catch((error) => {
      if (!mounted) return;
      console.error('AuthContext: Session check failed:', error);
      setLoading(false);
      if (initTimeout) {
        clearTimeout(initTimeout);
        initTimeout = null as any;
      }
    });

    return () => {
      mounted = false;
      console.log('AuthContext: Cleaning up auth subscription');
      authSubscription.unsubscribe();
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
