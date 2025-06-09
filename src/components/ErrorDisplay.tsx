
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  lastGenerationError: {
    error: string;
    debug?: any;
    suggestion?: string;
  } | null;
  onRetry?: () => void;
}

const ErrorDisplay = ({ lastGenerationError, onRetry }: ErrorDisplayProps) => {
  if (!lastGenerationError) return null;

  const isNetworkError = lastGenerationError.error.includes('network') || 
                        lastGenerationError.error.includes('timeout') ||
                        lastGenerationError.error.includes('400') ||
                        lastGenerationError.error.includes('422');

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-red-400 font-medium mb-2">
            {isNetworkError ? 'Connection Error' : 'Signal Generation Error'}
          </h3>
          <div className="text-red-300 text-sm space-y-2">
            <p>
              <strong>Error:</strong> {lastGenerationError.error}
            </p>
            
            {isNetworkError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                <p className="text-xs text-red-300">
                  This appears to be a network or database connectivity issue. 
                  The system will retry automatically, or you can try again manually.
                </p>
              </div>
            )}
            
            {lastGenerationError.debug && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-400 hover:text-red-300">
                  Show Debug Information
                </summary>
                <pre className="text-xs mt-1 bg-black/20 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                  {typeof lastGenerationError.debug === 'string' 
                    ? lastGenerationError.debug 
                    : JSON.stringify(lastGenerationError.debug, null, 2)}
                </pre>
              </details>
            )}
            
            {lastGenerationError.suggestion && (
              <p><strong>Suggestion:</strong> {lastGenerationError.suggestion}</p>
            )}
          </div>
          
          {onRetry && (
            <div className="mt-3">
              <Button
                onClick={onRetry}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
