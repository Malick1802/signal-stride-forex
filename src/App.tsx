
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MobileAppWrapper from "./components/MobileAppWrapper";
import MobileDebugger from "./components/MobileDebugger";
import MobileRouteDebugger from "./components/MobileRouteDebugger";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import { MobileRouteManager } from './utils/mobileRouteManager';

// Import mobile app CSS
import './mobile-app.css';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize mobile routing
    MobileRouteManager.initializeMobileRouting();

    // Add mobile app classes to document
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('mobile-app');
      document.documentElement.classList.add('capacitor-app');
      console.log('🚀 ForexAlert Pro running as native mobile app');
      console.log('📱 Platform:', Capacitor.getPlatform());
      console.log('🌐 Current URL:', window.location.href);
      console.log('🛣️ Current pathname:', window.location.pathname);
    } else {
      console.log('🌐 ForexAlert Pro running as web app');
    }

    // Apply mobile-specific body styles
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    // Remove overflow hidden to allow scrolling
    // document.body.style.overflow = 'hidden';
  }, []);

  return (
    <div className={`mobile-app-wrapper ${Capacitor.isNativePlatform() ? 'capacitor-app' : ''}`}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MobileAppWrapper>
            <MobileDebugger />
            <Toaster />
            <Sonner />
            <BrowserRouter basename={Capacitor.isNativePlatform() ? '/' : undefined}>
              <MobileRouteDebugger />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/test" element={<TestPage />} />
                {/* Handle common mobile routing issues */}
                <Route path="/index.html" element={<Navigate to="/" replace />} />
                <Route path="/app" element={<Navigate to="/" replace />} />
                <Route path="/android_asset/www/index.html" element={<Navigate to="/" replace />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </MobileAppWrapper>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
