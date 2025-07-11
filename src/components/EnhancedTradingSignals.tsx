
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
import SignalCard from './SignalCard';
import SignalCardLoading from './SignalCardLoading';
import Logger from '@/utils/logger';

const EnhancedTradingSignals = memo(() => {
  const { signals, loading, fetchSignals, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { isConnected } = useMobileConnectivity();
  const { 
    cachedSignals, 
    isUsingCache, 
    hasCache, 
    cacheSignals, 
    cacheStats 
  } = useOfflineSignals();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
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

  // Enhanced signal generation with better error handling
  const handleGenerateSignals = useCallback(async () => {
    if (isGenerating || !isConnected) return;
    
    setIsGenerating(true);
    try {
      Logger.info('signals', 'Manually triggering signal generation...');
      await triggerAutomaticSignalGeneration();
      
      // Wait a bit and then refresh
      setTimeout(async () => {
        await fetchSignals();
        setIsGenerating(false);
      }, 3000);
      
    } catch (error) {
      Logger.error('signals', 'Error generating signals:', error);
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: "Failed to generate new signals. Please try again.",
        variant: "destructive",
      });
    }
  }, [isGenerating, isConnected, triggerAutomaticSignalGeneration, fetchSignals, toast]);

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

        {isConnected && (
          <Button
            onClick={handleGenerateSignals}
            disabled={isGenerating || loading}
            variant="default"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Signals'}
          </Button>
        )}
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
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[400px]">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-foreground">No Active Signals</h3>
          <p className="text-muted-foreground max-w-md">
            No trading signals are currently active. New signals will be generated automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isConnected && (
              <Button
                onClick={handleGenerateSignals}
                disabled={isGenerating || loading}
                variant="default"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate Now'}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
});

EnhancedTradingSignals.displayName = 'EnhancedTradingSignals';

export default EnhancedTradingSignals;
