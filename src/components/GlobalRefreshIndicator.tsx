
import React from 'react';
import { useGlobalRefresh } from '@/hooks/useGlobalRefresh';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

const GlobalRefreshIndicator = () => {
  const { isUpdating, lastPriceUpdate, isConnected, triggerManualUpdate } = useGlobalRefresh();

  const formatLastUpdate = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const timeSinceUpdate = lastPriceUpdate > 0 ? Date.now() - lastPriceUpdate : 0;
  const secondsSinceUpdate = Math.floor(timeSinceUpdate / 1000);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 ${
            isConnected ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Update Status */}
          <div className="flex items-center space-x-2">
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-blue-400 text-sm">Updating...</span>
              </>
            ) : (
              <>
                <div className={`w-2 h-2 rounded-full ${
                  secondsSinceUpdate < 15 ? 'bg-emerald-400 animate-pulse' : 
                  secondsSinceUpdate < 30 ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <span className="text-white text-sm">
                  Last: {formatLastUpdate(lastPriceUpdate)}
                  {secondsSinceUpdate > 0 && ` (${secondsSinceUpdate}s ago)`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={triggerManualUpdate}
          disabled={isUpdating}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs rounded transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Auto-refresh Info */}
      <div className="mt-2 text-xs text-gray-400">
        Auto-refresh: Prices every 8s • Signals every 45s • Full sync every 3min
      </div>
    </div>
  );
};

export default GlobalRefreshIndicator;
