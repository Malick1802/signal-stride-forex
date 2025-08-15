
import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';
import MinimalStartup from "./components/MinimalStartup";
import MobileAppWrapper from "./components/MobileAppWrapper";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import { Capacitor } from '@capacitor/core';

// Force cache clear - TooltipProvider fix v2

// Import mobile app CSS
import './mobile-app.css';

const queryClient = new QueryClient();

const App = () => {
  const [startupComplete, setStartupComplete] = useState(false);

  useEffect(() => {
    // Basic platform logging
    console.log('🚀 ForexAlert Pro starting...');
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Platform:', Capacitor.getPlatform());
    } else {
      console.log('🌐 Web platform');
    }
  }, []);

  // Show minimal startup screen first
  if (!startupComplete) {
    return <MinimalStartup onStartupComplete={() => setStartupComplete(true)} />;
  }

  // Once startup is complete, render the full app
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test" element={<TestPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
        <Toaster />
        <Sonner />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
