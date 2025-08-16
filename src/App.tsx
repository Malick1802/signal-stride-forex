
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

// Import mobile app CSS and i18n configuration
import './mobile-app.css';
import './i18n';

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
          <LanguageProvider>
            <HashRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/test" element={<TestPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
            <Toaster />
            <Sonner />
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
