
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MobileAppWrapper from "./components/MobileAppWrapper";
import MobileDebugger from "./components/MobileDebugger";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import { Capacitor } from '@capacitor/core';


// Import mobile app CSS
import './mobile-app.css';

const queryClient = new QueryClient();

const App = () => {
  React.useEffect(() => {
    // Log platform information
    if (Capacitor.isNativePlatform()) {
      console.log('🚀 ForexAlert Pro running as native mobile app');
      console.log('📱 Platform:', Capacitor.getPlatform());
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
          <BrowserRouter basename={Capacitor.isNativePlatform() ? '' : undefined}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/test" element={<TestPage />} />
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
