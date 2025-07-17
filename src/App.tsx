
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MobileApp from "./components/MobileApp";
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
    } else {
      console.log('🌐 ForexAlert Pro running as web app');
    }
  }, []);

  // Use mobile app for native platforms, web app for browsers
  if (Capacitor.isNativePlatform()) {
    return (
      <QueryClientProvider client={queryClient}>
        <MobileApp />
      </QueryClientProvider>
    );
  }

  // Web app fallback
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/test" element={<TestPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;