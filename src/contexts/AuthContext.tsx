
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { useAuthPersistence } from '@/hooks/useAuthPersistence';

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
  const { trackSignup, trackSubscription } = useReferralTracking();
  const { sessionHealth, checkSessionHealth, refreshSession, handleNetworkReconnection } = useSessionMonitor();
  const { saveAuthState } = useAuthPersistence(user, session, subscription);

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
        
        // Handle different error types with improved retry logic
        if (error.message?.includes('401') || error.message?.includes('Authentication') || error.message?.includes('JWT')) {
          console.log('AuthContext: Authentication error, attempting session recovery...');
          
          // Try session monitor's refresh first
          const refreshSuccess = await refreshSession();
          
          if (refreshSuccess) {
            // Get the refreshed session and retry
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession) {
              console.log('AuthContext: Retrying subscription check with refreshed session');
              const { data: retryData, error: retryError } = await supabase.functions.invoke('check-subscription', {
                headers: {
                  Authorization: `Bearer ${newSession.access_token}`,
                },
              });
              
              if (!retryError && retryData) {
                console.log('AuthContext: Subscription data received after session recovery:', retryData);
                setSubscription(retryData);
                setCachedSubscription(userId, retryData);
                return;
              }
            }
          } else {
            console.warn('AuthContext: Session recovery failed, using fallback subscription state');
          }
        }
        
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
      
      // Track referral subscription conversion
      console.log('AuthContext: Tracking referral subscription for:', currentSession.user.id);
      await trackSubscription(currentSession.user.id, 99); // Assuming $99 subscription
      
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
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', event, session?.user?.email || 'no user');
        
        // Update state immediately - NEVER clear session unless explicitly signed out
        if (event === 'SIGNED_OUT') {
          console.log('AuthContext: User explicitly signed out');
          setSession(null);
          setUser(null);
          setSubscription(null);
          clearSubscriptionCache();
        } else if (session) {
          // Only update session if we have a valid one
          setSession(session);
          setUser(session.user);
        }
        
        // Handle subscription check after state update
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          console.log('AuthContext: User authenticated, checking subscription');
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            checkSubscription(false);
          }, 100);
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
    const redirectUrl = `${window.location.origin}/#/auth/callback`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        console.error('AuthContext: Signup error:', error);
        
        // Provide user-friendly error messages for Android
        if (error.message?.includes('fetch')) {
          return { 
            error: { 
              ...error, 
              message: 'Network connection failed. Please check your internet connection and try again.' 
            } 
          };
        }
      } else {
        console.log('AuthContext: Signup successful');
        
        // Track referral signup if user is created
        if (data.user) {
          console.log('AuthContext: Tracking referral signup for:', data.user.id);
          await trackSignup(data.user.id);
        }
      }
      
      return { error };
    } catch (networkError: any) {
      console.error('AuthContext: Network error during signup:', networkError);
      return { 
        error: { 
          message: 'Connection failed. Please check your network and try again.',
          name: 'NetworkError'
        } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext: Attempting signin for:', email);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('AuthContext: Signin error:', error);
        
        // Provide user-friendly error messages for Android
        if (error.message?.includes('fetch')) {
          return { 
            error: { 
              ...error, 
              message: 'Network connection failed. Please check your internet connection and try again.' 
            } 
          };
        }
      } else {
        console.log('AuthContext: Signin successful');
      }
      
      return { error };
    } catch (networkError: any) {
      console.error('AuthContext: Network error during signin:', networkError);
      return { 
        error: { 
          message: 'Connection failed. Please check your network and try again.',
          name: 'NetworkError'
        } 
      };
    }
  };

  const signOut = async () => {
    console.log('AuthContext: User initiated signout');
    
    try {
      // Clear all cached data first
      setSubscription(null);
      clearSubscriptionCache();
      
      // Clear session backup
      localStorage.removeItem('session_backup');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: Signout error:', error);
        // Even if signout fails, clear local state
        setSession(null);
        setUser(null);
      } else {
        console.log('AuthContext: User successfully signed out');
      }
      
      return { error };
    } catch (error: any) {
      console.error('AuthContext: Signout failed:', error);
      // Force clear local state on any error
      setSession(null);
      setUser(null);
      setSubscription(null);
      return { error };
    }
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
