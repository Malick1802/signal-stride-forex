
import React, { createContext, useContext } from 'react';
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
}

// Global state to manage auth without React hooks
let globalAuthState = {
  user: null as User | null,
  session: null as Session | null,
  subscription: null as SubscriptionData | null,
  loading: true,
};

// Context for sharing auth state
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Initialize auth state on app load
const initializeAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    globalAuthState.session = session;
    globalAuthState.user = session?.user ?? null;
    globalAuthState.loading = false;
    
    console.log('Auth initialized:', session?.user?.email || 'no user');
  } catch (error) {
    console.error('Auth initialization error:', error);
    globalAuthState.loading = false;
  }
};

// Set up auth listener without hooks
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session?.user?.email || 'no user');
  globalAuthState.session = session;
  globalAuthState.user = session?.user ?? null;
  globalAuthState.loading = false;
});

// Initialize immediately
initializeAuth();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const signUp = async (email: string, password: string) => {
    console.log('Attempting signup for:', email);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('Signup error:', error);
    } else {
      console.log('Signup successful');
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting signin for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Signin error:', error);
    } else {
      console.log('Signin successful');
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('Attempting signout');
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Signout error:', error);
    } else {
      console.log('Signout successful');
    }
    
    globalAuthState.subscription = null;
    return { error };
  };

  const checkSubscription = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession?.user) {
      console.log('No current session, skipping subscription check');
      globalAuthState.subscription = null;
      return;
    }
    
    try {
      console.log('Checking subscription for user', currentSession.user.email);
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        globalAuthState.subscription = {
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          trial_end: null,
          is_trial_active: false,
          has_access: false
        };
        return;
      }

      console.log('Subscription data received:', data);
      globalAuthState.subscription = data;
    } catch (error) {
      console.error('Error checking subscription:', error);
      globalAuthState.subscription = {
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        trial_end: null,
        is_trial_active: false,
        has_access: false
      };
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

  const value: AuthContextType = {
    user: globalAuthState.user,
    session: globalAuthState.session,
    subscription: globalAuthState.subscription,
    loading: globalAuthState.loading,
    signUp,
    signIn,
    signOut,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
