
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  lastGenerationError: {
    error: string;
    debug?: any;
    suggestion?: string;
  } | null;
}

const ErrorDisplay = ({ lastGenerationError }: ErrorDisplayProps) => {
  if (!lastGenerationError) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-red-400 font-medium mb-2">Signal Generation Error</h3>
          <div className="text-red-300 text-sm space-y-1">
            <p><strong>Error:</strong> {lastGenerationError.error}</p>
            {lastGenerationError.debug && (
              <div>
                <strong>Debug Info:</strong>
                <pre className="text-xs mt-1 bg-black/20 p-2 rounded overflow-x-auto">
                  {JSON.stringify(lastGenerationError.debug, null, 2)}
                </pre>
              </div>
            )}
            {lastGenerationError.suggestion && (
              <p><strong>Suggestion:</strong> {lastGenerationError.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
