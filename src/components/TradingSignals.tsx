
import React, { useState, memo, useMemo, useCallback } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSystemHealthMonitor } from '@/hooks/useSystemHealthMonitor';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, Signal, BarChart3, AlertTriangle, Zap } from 'lucide-react';
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

  // Debug information
  const debugInfo = useMemo(() => {
    return {
      signalCount: signals.length,
      loading,
      lastUpdate,
      distribution: signalDistribution,
      systemHealth: systemHealth?.status || 'unknown'
    };
  }, [signals.length, loading, lastUpdate, signalDistribution, systemHealth]);

  return (
    <div className="space-y-6">
      {/* Debug Info for troubleshooting */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              <span>Debug Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-yellow-700 dark:text-yellow-300">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Signal Grid or Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <SignalCardLoading key={i} pair="Loading..." />
          ))}
        </div>
      ) : signals.length > 0 ? (
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
      ) : (
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              <Activity className="h-5 w-5" />
              <span>No Active Signals</span>
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              There are currently no active trading signals available. Generate new signals to start trading.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Get Started with Signals
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Click "Generate New Signals" to create AI-powered trading opportunities based on current market conditions.
              </p>
              <div className="flex space-x-3">
                <Button
                  onClick={handleGenerateSignals}
                  disabled={isGenerating}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Generate New Signals</span>
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
            
            {lastUpdate && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdate}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
