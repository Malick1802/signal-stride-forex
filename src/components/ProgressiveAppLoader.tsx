
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '../contexts/AuthContext';
import Index from "../pages/Index";
import TestPage from "../pages/TestPage";
import NotFound from "../pages/NotFound";

// Create QueryClient outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const ProgressiveAppLoader: React.FC = () => {
  console.log('🚀 ProgressiveAppLoader: Rendering app');

  // Render full app directly without progressive loading
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default ProgressiveAppLoader;
