
import React from 'react';
import { AlertCircle, RefreshCw, Clock, Zap } from 'lucide-react';
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

  const isTimeoutError = lastGenerationError.error.includes('timeout') || 
                        lastGenerationError.error.includes('504') ||
                        lastGenerationError.error.includes('Function timeout');
  
  const isNetworkError = lastGenerationError.error.includes('network') || 
                        lastGenerationError.error.includes('400') ||
                        lastGenerationError.error.includes('422');

  const isOptimizedError = lastGenerationError.error.includes('optimized') ||
                          lastGenerationError.error.includes('concurrent');

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-red-400 font-medium mb-2">
            {isTimeoutError ? 'Function Timeout (Enhanced Protection Active)' : 
             isNetworkError ? 'Connection Error' : 
             'Signal Generation Error'}
          </h3>
          <div className="text-red-300 text-sm space-y-2">
            <p>
              <strong>Error:</strong> {lastGenerationError.error}
            </p>
            
            {isTimeoutError && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400 font-medium">Timeout Protection Enhanced</span>
                </div>
                <div className="text-xs text-blue-300 space-y-1">
                  <p>• <strong>NEW:</strong> Function timeout limit: 120 seconds (was unlimited)</p>
                  <p>• <strong>NEW:</strong> Maximum 8 signals per run (was 20)</p>
                  <p>• <strong>NEW:</strong> Concurrent processing: 3 pairs at once</p>
                  <p>• <strong>NEW:</strong> Prioritized major currency pairs</p>
                  <p>• <strong>NEW:</strong> Optimized AI prompts (-50% token usage)</p>
                  <p>• <strong>MAINTAINED:</strong> Every signal requires AI analysis</p>
                </div>
              </div>
            )}
            
            {isNetworkError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                <p className="text-xs text-red-300">
                  Network connectivity issue detected. The optimized system includes enhanced retry logic 
                  and should recover automatically on the next execution cycle.
                </p>
              </div>
            )}

            {isOptimizedError && (
              <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">Optimization Active</span>
                </div>
                <div className="text-xs text-green-300">
                  The function is running with enhanced performance optimizations. 
                  This should prevent timeout issues while maintaining signal quality.
                </div>
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
                Retry with Optimizations
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
