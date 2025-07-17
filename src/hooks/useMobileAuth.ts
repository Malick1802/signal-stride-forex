
import { useAuth } from '@/contexts/AuthContext';
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
  
  // Static state to avoid React hooks corruption
  const mobileAuthState: MobileAuthState = {
    isAuthenticating: false,
    authError: null,
    hasOfflineAuth: false,
    lastAuthSync: null
  };

  const mobileSignIn = async (email: string, password: string) => {
    try {
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      const result = await signIn(email, password);
      return result;
    } catch (error: any) {
      return { error: { message: error.message || 'Sign in failed' } };
    }
  };

  const mobileSignUp = async (email: string, password: string) => {
    try {
      if (!isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
      const result = await signUp(email, password);
      return result;
    } catch (error: any) {
      return { error: { message: error.message || 'Sign up failed' } };
    }
  };

  const mobileSignOut = async () => {
    try {
      const result = await signOut();
      return result;
    } catch (error: any) {
      return { error: { message: error.message || 'Sign out failed' } };
    }
  };

  const retryAuth = async () => {
    await retryConnection();
  };

  return {
    user,
    loading,
    isConnected,
    mobileSignIn,
    mobileSignUp,
    mobileSignOut,
    retryAuth,
    authError: mobileAuthState.authError,
    hasOfflineAuth: mobileAuthState.hasOfflineAuth,
    lastAuthSync: mobileAuthState.lastAuthSync
  };
};
