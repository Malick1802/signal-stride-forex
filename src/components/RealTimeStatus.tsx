
import React from 'react';
import { Wifi, WifiOff, RotateCcw, Activity } from 'lucide-react';
import { useRealTimeConnection } from '@/hooks/useRealTimeConnection';
import { Button } from '@/components/ui/button';

const RealTimeStatus = () => {
  const { isConnected, lastHeartbeat, reconnectAttempts, error, reconnect } = useRealTimeConnection();

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${
              isConnected ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {isConnected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>

          {lastHeartbeat && (
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Activity className="h-3 w-3" />
              <span>Last: {lastHeartbeat}</span>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
              {error}
            </div>
          )}

          {reconnectAttempts > 0 && (
            <div className="text-xs text-yellow-400">
              Reconnect attempts: {reconnectAttempts}
            </div>
          )}
        </div>

        {!isConnected && (
          <Button
            onClick={reconnect}
            size="sm"
            variant="outline"
            className="text-xs border-white/20 text-white hover:bg-white/10"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>
    </div>
  );
};

export default RealTimeStatus;
