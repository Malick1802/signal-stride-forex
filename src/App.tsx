import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import MobileAppWrapper from "./components/MobileAppWrapper";
import MobileDebugger from "./components/MobileDebugger";
import Index from "./pages/Index";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";


// Import mobile app CSS
import './mobile-app.css';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileAppWrapper>
        <MobileDebugger />
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test" element={<TestPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </MobileAppWrapper>
    </QueryClientProvider>
  );
};

export default App;