
import React, { Suspense, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import ErrorBoundary from "./components/ErrorBoundary";

// Import mobile app CSS
import './mobile-app.css';

// Component to handle email confirmation redirects
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have auth callback parameters in the URL search params
    const urlParams = new URLSearchParams(window.location.search);
    const tokenHash = urlParams.get('token_hash');
    const type = urlParams.get('type');
    
    // If we have confirmation parameters but we're not on the callback route, redirect
    if (tokenHash && type && location.pathname !== '/auth/callback') {
      console.log('🔗 AuthRedirectHandler: Found confirmation params, redirecting to callback');
      navigate(`/auth/callback${window.location.search}`);
    }
  }, [navigate, location.pathname]);

  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  console.log('🚀 ForexAlert Pro - Ultra-minimal startup');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HashRouter>
            <AuthRedirectHandler />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/test" element={<TestPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
