
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MobileAppWrapper from "./components/MobileAppWrapper";
import MobileDebugger from "./components/MobileDebugger";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

// Import mobile app CSS
import './mobile-app.css';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Log platform information
    if (Capacitor.isNativePlatform()) {
      console.log('🚀 ForexAlert Pro running as native mobile app');
      console.log('📱 Platform:', Capacitor.getPlatform());
      console.log('🌐 Current URL:', window.location.href);
      console.log('🛣️ Current pathname:', window.location.pathname);
    } else {
      console.log('🌐 ForexAlert Pro running as web app');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MobileAppWrapper>
          <MobileDebugger />
          <Toaster />
          <Sonner />
          <BrowserRouter basename={Capacitor.isNativePlatform() ? '/' : undefined}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/test" element={<TestPage />} />
              {/* Ensure root route redirects properly on mobile */}
              <Route path="/index.html" element={<Navigate to="/" replace />} />
              <Route path="/app" element={<Navigate to="/" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </MobileAppWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
