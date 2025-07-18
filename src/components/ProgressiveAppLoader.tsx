
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '../contexts/SafeAuthContext';
import Index from "../pages/Index";
import TestPage from "../pages/TestPage";
import NotFound from "../pages/NotFound";
import MobileLoadingScreen from './MobileLoadingScreen';

// Create QueryClient outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

type LoadingPhase = 'initializing' | 'query-client' | 'router' | 'auth' | 'complete';

const ProgressiveAppLoader: React.FC = () => {
  const [phase, setPhase] = useState<LoadingPhase>('initializing');

  useEffect(() => {
    console.log('🚀 Progressive App Loader: Starting initialization');
    
    // Phase 1: Basic React initialization
    const timer1 = setTimeout(() => {
      console.log('📦 Phase 1: React initialized');
      setPhase('query-client');
    }, 100);

    return () => clearTimeout(timer1);
  }, []);

  useEffect(() => {
    if (phase === 'query-client') {
      // Phase 2: QueryClient setup
      const timer2 = setTimeout(() => {
        console.log('📦 Phase 2: QueryClient initialized');
        setPhase('router');
      }, 100);

      return () => clearTimeout(timer2);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'router') {
      // Phase 3: Router setup
      const timer3 = setTimeout(() => {
        console.log('📦 Phase 3: Router initialized');
        setPhase('auth');
      }, 100);

      return () => clearTimeout(timer3);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'auth') {
      // Phase 4: Auth context setup
      const timer4 = setTimeout(() => {
        console.log('📦 Phase 4: Auth initialized');
        setPhase('complete');
      }, 200);

      return () => clearTimeout(timer4);
    }
  }, [phase]);

  // Show loading screen during initialization
  if (phase !== 'complete') {
    const messages = {
      'initializing': 'Starting ForexAlert Pro...',
      'query-client': 'Initializing data layer...',
      'router': 'Setting up navigation...',
      'auth': 'Loading authentication...'
    };
    
    return <MobileLoadingScreen message={messages[phase] || 'Loading...'} />;
  }

  // Render full app once all phases are complete
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default ProgressiveAppLoader;
