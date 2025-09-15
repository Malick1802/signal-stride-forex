import React from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectionManager } from '@/hooks/useConnectionManager';
import { useRealTimeManager } from '@/hooks/useRealTimeManager';
import { Capacitor } from '@capacitor/core';

const AndroidConnectionStatus = () => {
  const { connectionState, retryConnection } = useConnectionManager();
  const { isConnected: isRealTimeConnected } = useRealTimeManager();
  
  const { isOnline, isSupabaseConnected, connectionType, retryCount, isRetrying, lastConnected } = connectionState;
  const isNative = Capacitor.isNativePlatform();
  const isFullyConnected = isOnline && isSupabaseConnected && isRealTimeConnected;

  if (isRetrying) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
        <span className="text-sm text-blue-300">
          Restoring connection...
        </span>
      </div>
    );
  }

  if (isFullyConnected) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-400" />
        <span className="text-sm text-green-300">
          Connected {isNative && connectionType !== 'unknown' ? `(${connectionType})` : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-5 w-5 text-orange-400" />
        <h3 className="font-semibold text-orange-300">Connection Issue</h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-3">
        {isNative 
          ? 'Unable to connect to the internet. Check your mobile data or WiFi connection.'
          : 'Unable to connect to ForexAlert Pro servers. Please check your internet connection.'
        }
      </p>
      
      {lastConnected && (
        <p className="text-xs text-gray-500 mb-3">
          Last connected: {new Date(lastConnected).toLocaleTimeString()}
        </p>
      )}
      
      {retryCount > 0 && (
        <p className="text-xs text-yellow-400 mb-3">
          Retry attempt: {retryCount}
        </p>
      )}
      
      <Button
        onClick={retryConnection}
        size="sm"
        className="w-full"
        disabled={isRetrying}
      >
        {isRetrying ? (
          <>
            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
            Retrying...
          </>
        ) : (
          'Retry Connection'
        )}
      </Button>
    </div>
  );
};

export default AndroidConnectionStatus;