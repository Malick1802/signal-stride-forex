import { useConnectionManager } from '@/hooks/useConnectionManager';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export const ProductionConnectionStatus = () => {
  const { connectionState, retryConnection } = useConnectionManager();
  const {
    isOnline,
    isSupabaseConnected,
    connectionType,
    lastConnected,
    retryCount,
    isRetrying
  } = connectionState;

  if (isOnline && isSupabaseConnected) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle className="w-3 h-3 text-green-500" />
        <span>Connected</span>
        {connectionType !== 'web' && connectionType !== 'unknown' && (
          <span className="text-xs">({connectionType})</span>
        )}
      </div>
    );
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-orange-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
        <XCircle className="w-4 w-4 text-orange-600" />
      </div>
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-2">
          <div className="text-sm">
            {!isOnline ? (
              <span>No internet connection detected</span>
            ) : (
              <span>Cannot connect to trading data service</span>
            )}
          </div>
          
          {lastConnected && (
            <div className="text-xs text-muted-foreground">
              Last connected: {new Date(lastConnected).toLocaleTimeString()}
            </div>
          )}
          
          {retryCount > 0 && (
            <div className="text-xs text-muted-foreground">
              Retry attempts: {retryCount}
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={retryConnection}
            disabled={isRetrying}
            className="self-start mt-2"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Connection
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};