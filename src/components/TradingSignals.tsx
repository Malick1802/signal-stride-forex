import React, { useState, memo, useCallback } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSystemHealthMonitor } from '@/hooks/useSystemHealthMonitor';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import SignalCard from './SignalCard';
import SignalCardLoading from './SignalCardLoading';
import Logger from '@/utils/logger';
import { useOfflineSignals } from '@/hooks/useOfflineSignals';
import { useMobileConnectivity } from '@/hooks/useMobileConnectivity';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, signalDistribution, triggerAutomaticSignalGeneration, fetchSignals } = useTradingSignals();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Enhanced monitoring systems
  useEnhancedSignalMonitoring();
  const { systemHealth, verifySystemHealth } = useSystemHealthMonitor();

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

  // Enhanced signal generation with better error handling
  const handleGenerateSignals = useCallback(async () => {
    if (isGenerating) return;
    
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
  }, [isGenerating, triggerAutomaticSignalGeneration, fetchSignals, toast]);

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
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="hover:bg-muted/50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Signals
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleGenerateSignals}
                disabled={isGenerating}
                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
              >
                {isGenerating ? "Analyzing..." : "Generate Signals"}
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
