
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '../contexts/SafeAuthContext';
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

  // Temporary minimal version without AuthProvider to debug React issue
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<div className="p-8"><h1>App is loading...</h1><p>Testing React without auth context</p></div>} />
          <Route path="/test" element={<TestPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default ProgressiveAppLoader;
