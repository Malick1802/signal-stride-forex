
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
    // Handle both regular URL params and hash-based params (for malformed URLs)
    const fullUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Also check for params in the hash portion (in case of malformed URLs)
    const hashParams = new URLSearchParams();
    if (fullUrl.includes('?')) {
      // Extract params from anywhere in the URL, even after multiple hashes
      const paramString = fullUrl.split('?').slice(1).join('?');
      const cleanParamString = paramString.split('#')[0]; // Remove any trailing hash
      const params = new URLSearchParams(cleanParamString);
      params.forEach((value, key) => hashParams.set(key, value));
    }
    
    // Normalize accidental "#no-reload" hash created by older builds
    const rawHash = window.location.hash;
    if (rawHash === '#no-reload' || location.pathname === '/no-reload') {
      navigate('/', { replace: true });
      return;
    }
    
    const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
    const type = urlParams.get('type') || hashParams.get('type');
    
    // If we have confirmation parameters but we're not on the callback route, redirect
    if (tokenHash && type && location.pathname !== '/auth/callback') {
      console.log('🔗 AuthRedirectHandler: Found confirmation params, redirecting to callback');
      const params = new URLSearchParams();
      params.set('token_hash', tokenHash);
      params.set('type', type);
      if (urlParams.get('email') || hashParams.get('email')) {
        params.set('email', urlParams.get('email') || hashParams.get('email') || '');
      }
      navigate(`/auth/callback?${params.toString()}`);
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
