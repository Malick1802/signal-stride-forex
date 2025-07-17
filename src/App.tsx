import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import './index.css';

const queryClient = new QueryClient();

// Minimal Index component to bypass tooltip issues
const MinimalIndex = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">ForexAlert Pro</h1>
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    </div>
  );
};

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <h1 className="text-2xl font-bold">Page Not Found</h1>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<MinimalIndex />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;