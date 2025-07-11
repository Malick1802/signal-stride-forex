
import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import MobileDebugger from "./components/MobileDebugger";
import MobileRouteDebugger from "./components/MobileRouteDebugger";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import { Capacitor } from '@capacitor/core';
import { MobileRouteManager } from './utils/mobileRouteManager';

// Import mobile app CSS
import './mobile-app.css';

const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering...');
  
  return (
    <div className="mobile-app-wrapper">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MobileDebugger />
          <Toaster />
          <Sonner />
          <HashRouter>
            <MobileRouteDebugger />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/test" element={<TestPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
