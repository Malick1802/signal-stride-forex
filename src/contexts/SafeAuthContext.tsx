
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  checkSubscription: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  subscription_tier: null,
  subscription_end: null,
  trial_end: null,
  is_trial_active: false,
  has_access: false
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!session?.user) {
      setSubscription(null);
      return;
    }

    try {
      console.log('SafeAuthContext: Checking subscription for user', session.user.email);
      const { data, error: subError } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (subError) {
        console.error('SafeAuthContext: Subscription check error:', subError);
        setSubscription(DEFAULT_SUBSCRIPTION);
        return;
      }

      console.log('SafeAuthContext: Subscription data received:', data);
      setSubscription(data || DEFAULT_SUBSCRIPTION);
    } catch (err) {
      console.error('SafeAuthContext: Subscription check failed:', err);
      setSubscription(DEFAULT_SUBSCRIPTION);
    }
  }, [session]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      clearError();
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        setError(error.message);
      }
      
      return { error };
    } catch (err: any) {
      const errorMsg = err.message || 'Signup failed';
      setError(errorMsg);
      return { error: { message: errorMsg } };
    }
  }, [clearError]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      clearError();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
      }
      
      return { error };
    } catch (err: any) {
      const errorMsg = err.message || 'Signin failed';
      setError(errorMsg);
      return { error: { message: errorMsg } };
    }
  }, [clearError]);

  const signOut = useCallback(async () => {
    try {
      clearError();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setError(error.message);
      } else {
        setSubscription(null);
      }
      
      return { error };
    } catch (err: any) {
      const errorMsg = err.message || 'Signout failed';
      setError(errorMsg);
      return { error: { message: errorMsg } };
    }
  }, [clearError]);

  useEffect(() => {
    if (isInitialized) return;

    console.log('SafeAuthContext: Initializing auth state');
    
    try {
      // Set up auth state listener
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          console.log('SafeAuthContext: Auth state changed:', event, newSession?.user?.email || 'no user');
          
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          // Check subscription after state update
          if (newSession?.user && event === 'SIGNED_IN') {
            setTimeout(() => {
              checkSubscription();
            }, 500);
          } else if (!newSession) {
            setSubscription(null);
          }
          
          setLoading(false);
        }
      );

      // Check for existing session
      supabase.auth.getSession().then(({ data: { session: currentSession }, error: sessionError }) => {
        if (sessionError) {
          console.error('SafeAuthContext: Session check error:', sessionError);
          setError('Failed to initialize authentication');
        }
        
        console.log('SafeAuthContext: Initial session check:', currentSession?.user?.email || 'no user');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(() => {
            checkSubscription();
          }, 500);
        }
        
        setLoading(false);
        setIsInitialized(true);
      });

      return () => {
        console.log('SafeAuthContext: Cleaning up auth subscription');
        authSubscription.unsubscribe();
      };
    } catch (err: any) {
      console.error('SafeAuthContext: Initialization error:', err);
      setError('Authentication initialization failed');
      setLoading(false);
      setIsInitialized(true);
    }
  }, [isInitialized, checkSubscription]);

  const value = {
    user,
    session,
    subscription,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    checkSubscription,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
