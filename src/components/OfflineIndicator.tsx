
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, Database, RefreshCw } from 'lucide-react';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { useOfflineSignals } from '@/hooks/useOfflineSignals';

export const OfflineIndicator = () => {
  const { isConnected, retryConnection, isRestoring } = useMobileConnectivity();
  const { isUsingCache, cacheStats, clearCache } = useOfflineSignals();

  if (isRestoring) {
    return (
      <div className="flex items-center space-x-2 text-blue-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Restoring connection...</span>
      </div>
    );
  }

  if (isConnected && !isUsingCache) {
    return (
      <div className="flex items-center space-x-2 text-green-400 text-sm">
        <Wifi className="w-4 h-4" />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Database className="w-4 h-4 text-blue-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-orange-400" />
          )}
          <div>
            <div className="font-medium text-sm">
              {isConnected ? 'Using Latest Data' : 'Offline Mode'}
            </div>
            <div className="text-xs text-gray-400">
              {isUsingCache ? (
                <>
                  Showing {cacheStats.totalSignals} cached signals
                  {cacheStats.isStale && ' (may be outdated)'}
                </>
              ) : (
                'No cached data available'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {cacheStats.totalSignals > 0 && (
            <Badge variant="secondary" className="text-xs">
              {cacheStats.totalSignals} cached
            </Badge>
          )}
          
          {!isConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={retryConnection}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {cacheStats.lastSync > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Last sync: {new Date(cacheStats.lastSync).toLocaleString()}
        </div>
      )}
    </div>
  );
};
