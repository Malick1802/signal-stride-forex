
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { useMobileConnectivity } from './useMobileConnectivity';

interface MobileAuthState {
  isAuthenticating: boolean;
  authError: string | null;
  hasOfflineAuth: boolean;
  lastAuthSync: Date | null;
}

export const useMobileAuth = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { isConnected, retryConnection } = useMobileConnectivity();
  const [mobileAuthState, setMobileAuthState] = useState<MobileAuthState>({
    isAuthenticating: false,
    authError: null,
    hasOfflineAuth: false,
    lastAuthSync: null
  });

  // Check for offline authentication state
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const offlineAuth = localStorage.getItem('mobile_auth_cache');
      const lastSync = localStorage.getItem('mobile_auth_sync');
      
      setMobileAuthState(prev => ({
        ...prev,
        hasOfflineAuth: !!offlineAuth,
        lastAuthSync: lastSync ? new Date(lastSync) : null
      }));
    }
  }, []);

  // Sync authentication state when connection is restored
  useEffect(() => {
    if (isConnected && mobileAuthState.hasOfflineAuth && !user) {
      console.log('📱 Mobile: Syncing offline auth state');
      // Clear offline auth cache when reconnected
      localStorage.removeItem('mobile_auth_cache');
      setMobileAuthState(prev => ({
        ...prev,
        hasOfflineAuth: false
      }));
    }
  }, [isConnected, mobileAuthState.hasOfflineAuth, user]);

  const mobileSignIn = useCallback(async (email: string, password: string) => {
    setMobileAuthState(prev => ({ ...prev, isAuthenticating: true, authError: null }));

    try {
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const result = await signIn(email, password);
      
      if (result.error) {
        let friendlyError = result.error.message;
        
        // Mobile-specific error handling
        if (friendlyError.includes('Invalid login credentials')) {
          friendlyError = 'Invalid email or password. Please check your credentials.';
        } else if (friendlyError.includes('Email not confirmed')) {
          friendlyError = 'Please check your email and confirm your account before signing in.';
        } else if (friendlyError.includes('Too many requests')) {
          friendlyError = 'Too many login attempts. Please wait a few minutes before trying again.';
        } else if (friendlyError.includes('Network')) {
          friendlyError = 'Network error. Please check your connection and try again.';
        }
        
        setMobileAuthState(prev => ({ ...prev, authError: friendlyError }));
        return { error: result.error };
      }

      // Cache successful authentication for offline reference
      if (Capacitor.isNativePlatform()) {
        localStorage.setItem('mobile_auth_cache', 'authenticated');
        localStorage.setItem('mobile_auth_sync', new Date().toISOString());
      }

      setMobileAuthState(prev => ({ 
        ...prev, 
        authError: null,
        lastAuthSync: new Date()
      }));
      
      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred during sign in.';
      setMobileAuthState(prev => ({ ...prev, authError: errorMessage }));
      return { error: { message: errorMessage } };
    } finally {
      setMobileAuthState(prev => ({ ...prev, isAuthenticating: false }));
    }
  }, [signIn, isConnected]);

  const mobileSignUp = useCallback(async (email: string, password: string) => {
    setMobileAuthState(prev => ({ ...prev, isAuthenticating: true, authError: null }));

    try {
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const result = await signUp(email, password);
      
      if (result.error) {
        let friendlyError = result.error.message;
        
        if (friendlyError.includes('User already registered') || friendlyError.includes('user_repeated_signup')) {
          // Auto-resend confirmation email for existing users
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            await supabase.auth.resend({
              type: 'signup',
              email: email,
              options: {
                emailRedirectTo: `${window.location.origin}/`
              }
            });
            friendlyError = 'Account already exists. We\'ve sent a new confirmation email to your inbox.';
          } catch (resendError) {
            friendlyError = 'An account with this email already exists. Please sign in or check your email for the confirmation link.';
          }
        } else if (friendlyError.includes('Password')) {
          friendlyError = 'Password must be at least 6 characters long.';
        } else if (friendlyError.includes('Network')) {
          friendlyError = 'Network error. Please check your connection and try again.';
        } else if (friendlyError.includes('hook')) {
          friendlyError = 'Email service configuration issue. Please contact support or try again later.';
        }
        
        setMobileAuthState(prev => ({ ...prev, authError: friendlyError }));
        return { error: result.error };
      }

      setMobileAuthState(prev => ({ ...prev, authError: null }));
      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred during sign up.';
      setMobileAuthState(prev => ({ ...prev, authError: errorMessage }));
      return { error: { message: errorMessage } };
    } finally {
      setMobileAuthState(prev => ({ ...prev, isAuthenticating: false }));
    }
  }, [signUp, isConnected]);

  const resendConfirmation = useCallback(async (email: string) => {
    setMobileAuthState(prev => ({ ...prev, isAuthenticating: true, authError: null }));

    try {
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend confirmation email.';
      setMobileAuthState(prev => ({ ...prev, authError: errorMessage }));
      return { error: { message: errorMessage } };
    } finally {
      setMobileAuthState(prev => ({ ...prev, isAuthenticating: false }));
    }
  }, [isConnected]);

  const mobileSignOut = useCallback(async () => {
    setMobileAuthState(prev => ({ ...prev, isAuthenticating: true, authError: null }));

    try {
      await signOut();
      
      // Clear mobile auth cache
      if (Capacitor.isNativePlatform()) {
        localStorage.removeItem('mobile_auth_cache');
        localStorage.removeItem('mobile_auth_sync');
      }
      
      setMobileAuthState(prev => ({ 
        ...prev, 
        hasOfflineAuth: false,
        lastAuthSync: null
      }));
      
      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred during sign out.';
      setMobileAuthState(prev => ({ ...prev, authError: errorMessage }));
      return { error: { message: errorMessage } };
    } finally {
      setMobileAuthState(prev => ({ ...prev, isAuthenticating: false }));
    }
  }, [signOut]);

  const retryAuth = useCallback(async () => {
    await retryConnection();
    setMobileAuthState(prev => ({ ...prev, authError: null }));
  }, [retryConnection]);

  return {
    user,
    loading: loading || mobileAuthState.isAuthenticating,
    isConnected,
    mobileSignIn,
    mobileSignUp,
    mobileSignOut,
    retryAuth,
    resendConfirmation,
    authError: mobileAuthState.authError,
    hasOfflineAuth: mobileAuthState.hasOfflineAuth,
    lastAuthSync: mobileAuthState.lastAuthSync
  };
};
