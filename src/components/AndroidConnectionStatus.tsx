import React from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProductionConnection } from '@/hooks/useProductionConnection';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { Capacitor } from '@capacitor/core';

const AndroidConnectionStatus = () => {
  const productionConnection = useProductionConnection();
  const mobileConnection = useMobileConnectivity();
  
  const isNative = Capacitor.isNativePlatform();
  const connection = isNative ? mobileConnection : productionConnection;
  
  const isConnected = connection.isConnected || connection.isOnline;
  const isRetrying = connection.retryCount > 0;

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-400" />
        <span className="text-sm text-green-300">
          Connected {isNative ? `(${connection.connectionType})` : ''}
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
      
      {connection.lastConnected && (
        <p className="text-xs text-gray-500 mb-3">
          Last connected: {new Date(connection.lastConnected).toLocaleTimeString()}
        </p>
      )}
      
      {isRetrying && (
        <p className="text-xs text-yellow-400 mb-3">
          Retry attempt: {connection.retryCount}
        </p>
      )}
      
      <Button
        onClick={connection.retryConnection}
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