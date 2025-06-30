
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
      {/* Signal Grid or Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <SignalCardLoading key={i} pair="Loading..." />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((signal) => (
            <SignalCard 
              key={signal.id} 
              signal={signal}
              analysis={analysis}
              analyzingSignal={analyzingSignal}
              onGetAIAnalysis={handleGetAIAnalysis}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
