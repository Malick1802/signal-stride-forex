
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SimpleMobileWrapper from "./components/SimpleMobileWrapper";
import MobileDebugger from "./components/MobileDebugger";
import BulletproofErrorBoundary from "./components/BulletproofErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import reactRecovery from './utils/reactRecovery';

// Import mobile app CSS
import './mobile-app.css';

const queryClient = new QueryClient();

const App = () => {
  const wrappedUseEffect = reactRecovery.wrapHook(useEffect, 'useEffect');
  
  wrappedUseEffect(() => {
    // Log platform information
    if (Capacitor.isNativePlatform()) {
      console.log('🚀 ForexAlert Pro running as native mobile app');
      console.log('📱 Platform:', Capacitor.getPlatform());
    } else {
      console.log('🌐 ForexAlert Pro running as web app');
    }
    
    // Log React recovery status
    const stats = reactRecovery.getRecoveryStats();
    if (stats.recoveryAttempts > 0) {
      console.log('🛡️ React recovery active:', stats);
    }
  }, []);

  return (
    <BulletproofErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SimpleMobileWrapper>
          <MobileDebugger />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SimpleMobileWrapper>
      </QueryClientProvider>
    </BulletproofErrorBoundary>
  );
};

export default App;
