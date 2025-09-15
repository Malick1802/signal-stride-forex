import React from 'react';
import { Wifi, WifiOff, XCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConnectionManager } from '@/hooks/useConnectionManager';

const ProductionConnectionStatus = () => {
  const { connectionState, retryConnection } = useConnectionManager();
  const { 
    isOnline, 
    isSupabaseConnected, 
    connectionType, 
    lastConnected, 
    retryCount, 
    isRetrying 
  } = connectionState;

  // Success state - both online and Supabase connected
  if (isOnline && isSupabaseConnected) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <Wifi className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <div className="flex items-center justify-between">
            <span>Connected • {connectionType}</span>
            <span className="text-xs opacity-70">
              {new Date(lastConnected).toLocaleTimeString()}
            </span>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Error state - show appropriate message and retry button
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>No internet connection</span>
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4" />
                  <span>Cannot connect to trading data service</span>
                </>
              )}
            </div>
            {lastConnected && (
              <span className="text-sm opacity-75">
                Last connected: {new Date(lastConnected).toLocaleTimeString()}
              </span>
            )}
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
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                Retrying...
              </>
            ) : (
              'Retry Connection'
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ProductionConnectionStatus;