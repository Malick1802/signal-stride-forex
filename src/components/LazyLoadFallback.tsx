
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LazyLoadFallbackProps {
  error?: Error;
  componentName?: string;
  onRetry?: () => void;
}

const LazyLoadFallback: React.FC<LazyLoadFallbackProps> = ({ 
  error, 
  componentName = 'Component',
  onRetry 
}) => {
  console.error(`🚨 Lazy loading failed for ${componentName}:`, error);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gradient-to-br from-slate-900/50 to-blue-900/50 rounded-lg border border-white/10">
      <AlertTriangle className="h-16 w-16 text-orange-400 mb-4" />
      
      <h3 className="text-xl font-bold text-white mb-2">
        Failed to Load {componentName}
      </h3>
      
      <p className="text-gray-300 text-center mb-6 max-w-md">
        {error?.message || 'The component could not be loaded. This might be due to a network issue or browser compatibility problem.'}
      </p>
      
      <Button
        onClick={handleRetry}
        className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
      
      <p className="text-xs text-gray-500 mt-4">
        If this problem persists, please check your internet connection
      </p>
    </div>
  );
};

export default LazyLoadFallback;
