import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorRecoveryProps {
  error: Error;
  retry: () => void;
  fallbackContent?: React.ReactNode;
}

const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  retry,
  fallbackContent
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const isNetworkError = error.message?.includes('fetch') || 
                        error.message?.includes('network') || 
                        error.message?.includes('connection') ||
                        !isOnline;

  const isAuthError = error.message?.includes('Authentication') || 
                      error.message?.includes('401') ||
                      error.message?.includes('Unauthorized');

  const isRequireError = error.message?.includes('require is not defined');

  if (fallbackContent && isNetworkError) {
    return (
      <div className="w-full">
        {fallbackContent}
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
                <WifiOff className="h-4 w-4" />
                <span>Working offline</span>
                {isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="h-6 px-2 text-xs"
                  >
                    {isRetrying ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Reconnect'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            {isNetworkError ? (
              isOnline ? <Wifi className="h-8 w-8 text-blue-400" /> : <WifiOff className="h-8 w-8 text-red-400" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            )}
          </div>
          <CardTitle className="text-white">
            {isRequireError ? 'App Update Required' :
             isAuthError ? 'Authentication Issue' :
             isNetworkError ? (isOnline ? 'Connection Problem' : 'No Internet Connection') :
             'Something went wrong'}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {isRequireError ? 'The app needs to restart with updated code.' :
             isAuthError ? 'Please sign in again to continue.' :
             isNetworkError ? (isOnline ? 'Unable to connect to services. Check your connection.' : 'Please check your internet connection.') :
             'An unexpected error occurred.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRequireError && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-sm text-red-200">
              <p className="font-medium mb-1">Technical Details:</p>
              <p className="font-mono text-xs opacity-80">CommonJS require() error detected</p>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-400" />
                <span>Connected to internet</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-400" />
                <span>No internet connection</span>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying || (!isOnline && isNetworkError)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : isRequireError ? (
                'Restart App'
              ) : (
                'Try Again'
              )}
            </Button>
            
            {isRequireError && (
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Force Reload
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Error ID: {Date.now().toString(36)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorRecovery;