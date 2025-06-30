
import React, { useState, memo, useMemo, useCallback } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSystemHealthMonitor } from '@/hooks/useSystemHealthMonitor';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, Signal, BarChart3 } from 'lucide-react';
import SignalCard from './SignalCard';
import SignalCardLoading from './SignalCardLoading';
import SignalStats from './SignalStats';
import Logger from '@/utils/logger';

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, signalDistribution, triggerAutomaticSignalGeneration, fetchSignals } = useTradingSignals();
  const { toast } = useToast();
  
  // Enhanced monitoring systems
  useEnhancedSignalMonitoring();
  const { systemHealth, verifySystemHealth } = useSystemHealthMonitor();

  // AI Analysis state for SignalCard
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);

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

  const signalStats = useMemo(() => {
    const buySignals = signals.filter(signal => signal.type === 'BUY').length;
    const sellSignals = signals.filter(signal => signal.type === 'SELL').length;
    const totalSignals = signals.length;
    const avgConfidence = signals.length > 0 
      ? Math.round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length)
      : 0;

    return {
      signalsCount: totalSignals,
      avgConfidence,
      lastUpdate: lastUpdate || 'Never'
    };
  }, [signals, lastUpdate]);

  const loadingPlaceholder = useMemo(() => (
    <div className="text-center py-4">
      <RefreshCw className="inline-block h-6 w-6 animate-spin mr-2" />
      Loading Signals...
    </div>
  ), []);

  const noSignalsPlaceholder = useMemo(() => (
    <div className="text-center py-4 text-gray-500">
      <Activity className="inline-block h-6 w-6 mr-2" />
      No signals available at this time.
    </div>
  ), []);

  return (
    <div className="space-y-6">
      <SignalStats 
        signalsCount={signalStats.signalsCount}
        avgConfidence={signalStats.avgConfidence}
        lastUpdate={signalStats.lastUpdate}
      />
      
      {signals.length === 0 && !loading && (
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              <Activity className="h-5 w-5" />
              <span>No Active Signals</span>
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              There are currently no active trading signals available. New signals will appear here when market conditions create trading opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-3">
              <Button
                onClick={triggerAutomaticSignalGeneration}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Signal className="h-4 w-4" />
                <span>Check for New Signals</span>
              </Button>
              
              <Button
                onClick={fetchSignals}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signal Grid */}
      {signals.length > 0 && (
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

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <SignalCardLoading key={i} pair="Loading..." />
          ))}
        </div>
      )}
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
