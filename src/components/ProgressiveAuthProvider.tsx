
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MobileLoadingScreen from './MobileLoadingScreen';

interface ProgressiveAuthState {
  isInitialized: boolean;
  hasBasicAuth: boolean;
  hasSubscription: boolean;
  loadingStage: 'auth' | 'subscription' | 'complete';
}

const ProgressiveAuthContext = createContext<ProgressiveAuthState>({
  isInitialized: false,
  hasBasicAuth: false,
  hasSubscription: false,
  loadingStage: 'auth'
});

export const useProgressiveAuth = () => useContext(ProgressiveAuthContext);

interface ProgressiveAuthProviderProps {
  children: React.ReactNode;
}

const ProgressiveAuthProvider: React.FC<ProgressiveAuthProviderProps> = ({ children }) => {
  const { user, subscription, loading } = useAuth();
  const [authState, setAuthState] = useState<ProgressiveAuthState>({
    isInitialized: false,
    hasBasicAuth: false,
    hasSubscription: false,
    loadingStage: 'auth'
  });

  useEffect(() => {
    // Immediate loading without artificial delays
    if (!loading) {
      setAuthState({
        isInitialized: true,
        hasBasicAuth: !!user,
        hasSubscription: !!subscription,
        loadingStage: 'complete'
      });
    }
  }, [user, subscription, loading]);

  const getLoadingMessage = () => {
    switch (authState.loadingStage) {
      case 'auth':
        return 'Authenticating...';
      case 'subscription':
        return 'Loading subscription data...';
      default:
        return 'Almost ready...';
    }
  };

  if (!authState.isInitialized) {
    return (
      <MobileLoadingScreen 
        message={getLoadingMessage()}
        showProgress={true}
      />
    );
  }

  return (
    <ProgressiveAuthContext.Provider value={authState}>
      {children}
    </ProgressiveAuthContext.Provider>
  );
};

export default ProgressiveAuthProvider;
