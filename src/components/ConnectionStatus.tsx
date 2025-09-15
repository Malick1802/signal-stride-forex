import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useConnectionManager } from '@/hooks/useConnectionManager';

const ConnectionStatus = () => {
  const { connectionState, retryConnection } = useConnectionManager();
  const { isOnline, isSupabaseConnected, connectionType, retryCount, isRetrying } = connectionState;

  if (isOnline && isSupabaseConnected) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <div className="flex items-center justify-between">
            <span>Connected ({connectionType})</span>
            <Wifi className="h-4 w-4" />
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {!isOnline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              <span>
                {!isOnline 
                  ? 'No network connection' 
                  : 'Cannot connect to trading data service'
                }
              </span>
            </div>
            {retryCount > 0 && (
              <span className="text-sm opacity-75">
                Retry attempts: {retryCount}
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={retryConnection}
            disabled={isRetrying}
            className="ml-2"
          >
            {isRetrying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Retry'
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ConnectionStatus;