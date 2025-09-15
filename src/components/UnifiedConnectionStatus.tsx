import React from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useConnectionManager } from '@/hooks/useConnectionManager';
import { useRealTimeManager } from '@/hooks/useRealTimeManager';

interface UnifiedConnectionStatusProps {
  showDetails?: boolean;
  variant?: 'badge' | 'alert' | 'inline';
  className?: string;
}

export const UnifiedConnectionStatus = ({ 
  showDetails = false, 
  variant = 'badge', 
  className = '' 
}: UnifiedConnectionStatusProps) => {
  const { connectionState, retryConnection } = useConnectionManager();
  const { isConnected: isRealTimeConnected, activeChannels } = useRealTimeManager();
  
  const { isOnline, isSupabaseConnected, connectionType, retryCount, isRetrying, lastConnected } = connectionState;

  const isFullyConnected = isOnline && isSupabaseConnected && isRealTimeConnected;
  
  const getStatusColor = () => {
    if (isFullyConnected) return 'success';
    if (isOnline && isSupabaseConnected) return 'warning'; 
    return 'destructive';
  };

  const getStatusText = () => {
    if (isFullyConnected) return 'Connected';
    if (isOnline && isSupabaseConnected) return 'Partial';
    if (isOnline) return 'API Disconnected';
    return 'Offline';
  };

  const getStatusIcon = () => {
    if (isFullyConnected) return <CheckCircle className="w-3 h-3" />;
    if (isOnline) return <AlertCircle className="w-3 h-3" />;
    return <WifiOff className="w-3 h-3" />;
  };

  if (variant === 'badge') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant={getStatusColor() as any} className="flex items-center space-x-1 text-xs">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </Badge>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            <span>Channels: {activeChannels.length}</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        {getStatusIcon()}
        <span className={isFullyConnected ? 'text-green-400' : 'text-yellow-400'}>
          {getStatusText()}
        </span>
        {connectionType && connectionType !== 'unknown' && (
          <span className="text-xs text-muted-foreground">({connectionType})</span>
        )}
      </div>
    );
  }

  // Alert variant
  if (isFullyConnected) {
    return (
      <Alert className={`border-green-500/50 bg-green-500/10 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-400">
          <div className="flex items-center justify-between">
            <span>Connected to trading services</span>
            {connectionType && connectionType !== 'unknown' && (
              <span className="text-xs">via {connectionType}</span>
            )}
          </div>
          {showDetails && lastConnected && (
            <div className="text-xs mt-1 opacity-75">
              Last connected: {new Date(lastConnected).toLocaleTimeString()}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">
              {!isOnline 
                ? 'No internet connection' 
                : 'Cannot connect to trading services'}
            </div>
            {showDetails && (
              <div className="text-sm mt-1">
                {retryCount > 0 && <span>Retry attempts: {retryCount}</span>}
                {lastConnected && (
                  <div className="text-xs">
                    Last connected: {new Date(lastConnected).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={retryConnection}
            disabled={isRetrying}
            className="ml-4"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
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