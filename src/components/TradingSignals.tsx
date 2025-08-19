import React, { useState, memo, useCallback } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSystemHealthMonitor } from '@/hooks/useSystemHealthMonitor';
import { useSignalRealTimeUpdates } from '@/hooks/useSignalRealTimeUpdates';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import SignalCard from './SignalCard';
import SignalCardLoading from './SignalCardLoading';
import { ProductionConnectionStatus } from './ProductionConnectionStatus';
import Logger from '@/utils/logger';
import { useOfflineSignals } from '@/hooks/useOfflineSignals';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { TradingSignal } from '@/types/signals';

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, signalDistribution, fetchSignals } = useTradingSignals();
  const { toast } = useToast();
  
  // Enhanced monitoring systems
  useEnhancedSignalMonitoring();
  const { systemHealth, verifySystemHealth } = useSystemHealthMonitor();

  // Real-time signal performance updates
  const handleSignalUpdate = useCallback((updatedSignal: TradingSignal) => {
    console.log('📊 Real-time signal performance update received:', {
      id: updatedSignal.id,
      symbol: updatedSignal.symbol,
      currentPrice: updatedSignal.current_price,
      currentPips: updatedSignal.current_pips,
      lastUpdate: updatedSignal.last_performance_update
    });
    
    // Force a refresh of signals to get the latest data
    fetchSignals();
  }, [fetchSignals]);

  useSignalRealTimeUpdates({
    onSignalUpdate: handleSignalUpdate,
    enabled: true
  });

  // AI Analysis state for SignalCard
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);

  // Enhanced offline capabilities
  const { 
    cachedSignals, 
    isUsingCache, 
    hasCache, 
    cacheSignals 
  } = useOfflineSignals();
  
  const { isConnected } = useMobileConnectivity();

  // Background sync setup
  const { performBackgroundSync } = useBackgroundSync({
    onSignalsFetched: (fetchedSignals) => {
      cacheSignals(fetchedSignals);
    }
  });

  // Determine which signals to display
  const displaySignals = isConnected ? signals : cachedSignals;

  // Cache online signals when they're fetched
  React.useEffect(() => {
    if (isConnected && signals.length > 0) {
      cacheSignals(signals);
    }
  }, [signals, isConnected, cacheSignals]);


  // Force refresh with loading state
  const handleRefresh = useCallback(async () => {
    try {
      Logger.info('signals', 'Manually refreshing signals...');
      await fetchSignals();
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
  }, [fetchSignals, toast]);

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

  return (
    <div className="space-y-6">
      <ProductionConnectionStatus />
      
      {/* Enhanced rendering with offline support */}
      {loading ? (
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
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-br from-background to-muted/30 border border-border/50 rounded-xl p-12 text-center shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6 bg-muted/50 rounded-full flex items-center justify-center">
              <div className="text-2xl text-muted-foreground/70">📊</div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              No Active Trading Signals
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md mx-auto">
              Our AI is continuously monitoring the markets. New high-quality signals will appear here when market conditions are favorable.
            </p>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="hover:bg-muted/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Signals
              </Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground/60">
              Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
