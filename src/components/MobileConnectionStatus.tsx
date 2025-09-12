
import React from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';

const MobileConnectionStatus = () => {
  const { isConnected, connectionType, lastConnected, retryCount, retryConnection } = useMobileConnectivity();

  if (isConnected) {
    return (
      <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <Wifi className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-medium">Connected</span>
          {Capacitor.isNativePlatform() && (
            <>
              <span className="text-gray-400 text-xs">•</span>
              <span className="text-gray-400 text-xs capitalize">{connectionType}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <WifiOff className="h-5 w-5 text-red-400 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-red-400 text-sm font-medium">No Connection</span>
            {Capacitor.isNativePlatform() && (
              <Smartphone className="h-3 w-3 text-gray-400" />
            )}
          </div>
          
          <p className="text-gray-300 text-xs mb-3">
            {Capacitor.isNativePlatform() 
              ? 'Unable to connect to ForexAlert Pro servers. Check your mobile data or WiFi. Push notifications may still work via FCM when connectivity returns.'
              : 'Unable to connect to the internet. Please check your connection.'
            }
          </p>
          
          {lastConnected && (
            <p className="text-gray-400 text-xs mb-3">
              Last connected: {lastConnected.toLocaleTimeString()}
            </p>
          )}
          
          {retryCount > 0 && (
            <div className="flex items-center space-x-2 mb-3">
              <AlertCircle className="h-3 w-3 text-yellow-400" />
              <span className="text-yellow-400 text-xs">
                Retry attempts: {retryCount}
              </span>
            </div>
          )}
          
          <Button
            onClick={retryConnection}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry Connection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileConnectionStatus;
