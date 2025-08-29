
import React, { useState, memo, useCallback } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useOfflineSignals } from '@/hooks/useOfflineSignals';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSystemHealthMonitor } from '@/hooks/useSystemHealthMonitor';
import { useToast } from '@/hooks/use-toast';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { OfflineIndicator } from './OfflineIndicator';
import SignalCard from './SignalCard';
import SignalCardLoading from './SignalCardLoading';
import Logger from '@/utils/logger';

const EnhancedTradingSignals = memo(() => {
  const { signals, loading, fetchSignals } = useTradingSignals();
  const { isConnected } = useMobileConnectivity();
  const { 
    cachedSignals, 
    isUsingCache, 
    hasCache, 
    cacheSignals, 
    cacheStats 
  } = useOfflineSignals();
  const { toast } = useToast();
  
  // Enhanced monitoring systems
  useEnhancedSignalMonitoring();
  const { systemHealth, verifySystemHealth } = useSystemHealthMonitor();

  // Background sync setup
  const { performBackgroundSync } = useBackgroundSync({
    onSignalsFetched: (fetchedSignals) => {
      // Cache the fetched signals
      cacheSignals(fetchedSignals);
    },
    syncInterval: 2 * 60 * 1000, // 2 minutes
  });

  // AI Analysis state for SignalCard
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);

  // Determine which signals to display
  const displaySignals = isConnected ? signals : cachedSignals;
  const isShowingLiveData = isConnected && signals.length > 0;
  const isShowingCachedData = !isConnected && cachedSignals.length > 0;


  // Force refresh with loading state
  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: "Offline",
        description: "Cannot refresh while offline. Check your connection.",
        variant: "destructive",
      });
      return;
    }

    try {
      Logger.info('signals', 'Manually refreshing signals...');
      await fetchSignals();
      await performBackgroundSync();
      toast({
        title: "Refreshed",
        description: "Signal data has been refreshed",
      });
    } catch (error) {
      Logger.error('signals', 'Error refreshing signals:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh signals. Please try again.",
        variant: "destructive",
      });
    }
  }, [isConnected, fetchSignals, performBackgroundSync, toast]);

  // AI Analysis function for SignalCard
  const handleGetAIAnalysis = useCallback(async (signalId: string) => {
    if (analyzingSignal === signalId) return;
    
    setAnalyzingSignal(signalId);
    try {
      // Mock AI analysis for now - in real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAnalysis(prev => ({
        ...prev,
        [signalId]: `AI Analysis for signal ${signalId}: Based on current market conditions and technical indicators, this signal shows strong potential with favorable risk-reward ratio.`
      }));
    } catch (error) {
      console.error('AI Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to get AI analysis for this signal.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingSignal(null);
    }
  }, [analyzingSignal, toast]);

  // Cache online signals when they're fetched
  React.useEffect(() => {
    if (isConnected && signals.length > 0) {
      cacheSignals(signals);
    }
  }, [signals, isConnected, cacheSignals]);

  return (
    <div className="space-y-4">
      {/* Connection and Cache Status */}
      <OfflineIndicator />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleRefresh}
          disabled={loading || !isConnected}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Messages */}
      {isShowingCachedData && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-400">
            📦 Showing Cached Signals ({cachedSignals.length})
          </div>
          <div className="text-xs text-gray-400 mt-1">
            These signals were cached when you were last online
            {cacheStats.isStale && ' and may be outdated'}
          </div>
        </div>
      )}

      {!isConnected && !hasCache && (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 text-center">
          <div className="text-gray-400">
            <div className="text-lg mb-2">📡</div>
            <div className="font-medium">No Data Available</div>
            <div className="text-sm mt-1">
              You're offline and no cached signals are available.
              Connect to the internet to load signals.
            </div>
          </div>
        </div>
      )}

      {/* Signal Grid or Loading */}
      {(loading && isConnected) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <SignalCardLoading key={i} pair="Loading..." />
          ))}
        </div>
      ) : displaySignals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displaySignals.map((signal) => (
            <SignalCard 
              key={signal.id} 
              signal={signal}
              analysis={analysis}
              analyzingSignal={analyzingSignal}
              onGetAIAnalysis={handleGetAIAnalysis}
            />
          ))}
        </div>
      ) : isConnected ? (
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 text-center">
          <div className="text-gray-400">
            <div className="text-lg mb-2">📊</div>
            <div className="font-medium">No Active Signals</div>
            <div className="text-sm mt-1">
              No trading signals are currently active.
              Try generating new signals or check back later.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

EnhancedTradingSignals.displayName = 'EnhancedTradingSignals';

export default EnhancedTradingSignals;
