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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!session) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const createCheckout = async () => {
    if (!session) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) return { error: error.message };
      return { url: data.url };
    } catch (error) {
      return { error: 'Failed to create checkout session' };
    }
  };

  const openCustomerPortal = async () => {
    if (!session) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) return { error: error.message };
      return { url: data.url };
    } catch (error) {
      return { error: 'Failed to open customer portal' };
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check subscription immediately when user logs in or session changes
        if (session?.user && event === 'SIGNED_IN') {
          // Use a small delay to ensure the session is fully established
          setTimeout(() => {
            checkSubscription();
          }, 100);
        } else if (!session) {
          setSubscription(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check subscription for existing session
        setTimeout(() => {
          checkSubscription();
        }, 100);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
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
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Signin error:', error);
    }
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setSubscription(null);
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
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
