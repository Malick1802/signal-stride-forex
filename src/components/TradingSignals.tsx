import React, { useState, memo } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useSignalMonitoring } from '@/hooks/useSignalMonitoring';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import RealTimeStatus from './RealTimeStatus';
import GlobalRefreshIndicator from './GlobalRefreshIndicator';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Activity, Brain, TestTube, Wrench } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { toast } = useToast();
  
  // Add signal monitoring
  useSignalMonitoring();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [testingSystem, setTestingSystem] = useState(false);
  const [cleaningCrons, setCleaningCrons] = useState(false);

  // Add market activation
  const { activateMarket } = useMarketActivation();

  // Filter out invalid signals and add validation
  const validSignals = signals.filter(signal => {
    if (!signal || typeof signal !== 'object' || !signal.id || !signal.pair || !signal.type) {
      return false;
    }
    return true;
  });

  const availablePairs = Array.from(new Set(validSignals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  const filteredSignals = selectedPair === 'All' ? validSignals : validSignals.filter(signal => signal.pair === selectedPair);

  const avgConfidence = validSignals.length > 0 
    ? Math.round(validSignals.reduce((sum, signal) => sum + (signal.confidence || 0), 0) / validSignals.length)
    : 87;

  const handleCleanupCrons = async () => {
    setCleaningCrons(true);
    try {
      console.log('🧹 Cleaning up cron jobs...');
      const { data, error } = await supabase.functions.invoke('cleanup-crons');
      
      if (error) {
        console.error('❌ Cron cleanup error:', error);
        toast({
          title: "Cleanup Error",
          description: "Failed to cleanup cron jobs. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Cron cleanup result:', data);
      toast({
        title: "✅ Cron Jobs Cleaned",
        description: "All cron jobs cleaned up and new signal generation cron created (every 5 minutes)",
      });
    } catch (error) {
      console.error('❌ Error cleaning crons:', error);
      toast({
        title: "Cleanup Error",
        description: "Failed to cleanup cron jobs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCleaningCrons(false);
    }
  };

  const handleTestSignalGeneration = async () => {
    setTestingSystem(true);
    try {
      console.log('🧪 Testing signal generation system...');
      const { data, error } = await supabase.functions.invoke('test-signal-generation');
      
      if (error) {
        console.error('❌ Test error:', error);
        toast({
          title: "Test Error",
          description: "Signal generation test failed. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Test result:', data);
      toast({
        title: "✅ Test Complete",
        description: `Market data: ${data.marketDataCount}, Signals before: ${data.signalsBeforeGeneration}, Signals after: ${data.signalsAfterGeneration}`,
      });

      // Refresh signals after test
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Error testing system:', error);
      toast({
        title: "Test Error",
        description: "Failed to test signal generation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTestingSystem(false);
    }
  };

  const handleRefreshSignals = async () => {
    setRefreshingSignals(true);
    try {
      await triggerAutomaticSignalGeneration();
    } catch (error) {
      console.error('Error refreshing AI signals:', error);
      toast({
        title: "Refresh Error",
        description: "Failed to refresh AI-powered signals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshingSignals(false);
    }
  };

  const handleGetAIAnalysis = async (signalId: string) => {
    if (analyzingSignal === signalId) return;
    
    setAnalyzingSignal(signalId);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { signal_id: signalId }
      });

      if (error) {
        console.error('AI analysis error:', error);
        toast({
          title: "Analysis Error",
          description: "Failed to get additional AI analysis. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data?.analysis) {
        setAnalysis(prev => ({
          ...prev,
          [signalId]: data.analysis
        }));
        
        toast({
          title: "Analysis Complete",
          description: "Additional AI analysis has been generated for this signal.",
        });
      }
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to get additional AI analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzingSignal(null);
    }
  };

  if (loading && validSignals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading AI-powered signals...</div>
      </div>
    );
  }

  const hasSignalData = validSignals.length > 0;

  return (
    <div className="space-y-6">
      <SignalStats 
        signalsCount={validSignals.length}
        avgConfidence={avgConfidence}
        lastUpdate={lastUpdate}
      />

      {/* Global Refresh Status */}
      <GlobalRefreshIndicator />

      {/* Real-time Connection Status */}
      <RealTimeStatus />

      {/* System Debugging Panel */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">System Debugging</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                DEBUG MODE
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleCleanupCrons}
              disabled={cleaningCrons}
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
              size="sm"
            >
              {cleaningCrons ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Fix Cron Jobs
                </>
              )}
            </Button>
            <Button
              onClick={handleTestSignalGeneration}
              disabled={testingSystem}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
              size="sm"
            >
              {testingSystem ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test System
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* AI-Powered System Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">AI-Powered Trading System</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                OPENAI + FASTFOREX
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            AI Analysis: Real-time market data • Advanced pattern recognition • Intelligent signal generation
          </div>
        </div>
      </div>

      {/* Centralized Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Centralized AI Signals</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                LIVE AI ANALYSIS
              </span>
            </div>
            <Button
              onClick={handleRefreshSignals}
              disabled={refreshingSignals}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              size="sm"
            >
              {refreshingSignals ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate AI Signals
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🧠 All users see identical AI-generated signals • Real-time market analysis • Auto-generated every 5 minutes
          </div>
        </div>
      </div>

      {/* Pair Filter */}
      {availablePairs.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm font-medium">Filter by pair:</span>
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All" className="bg-gray-800 text-white">All Pairs ({validSignals.length})</option>
                {availablePairs.map(pair => (
                  <option key={pair} value={pair} className="bg-gray-800 text-white">
                    {pair} ({validSignals.filter(s => s.pair === pair).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400">
              AI-powered • Outcome monitoring enabled
            </div>
          </div>
        </div>
      )}

      {/* Active AI-Generated Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? 'AI Trading Signals' : `${selectedPair} AI Signals`} ({filteredSignals.length})
        </h3>
        
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignals.map(signal => {
              if (!signal || !signal.id) {
                return null;
              }
              
              return (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  analysis={analysis}
                  analyzingSignal={analyzingSignal}
                  onGetAIAnalysis={handleGetAIAnalysis}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? 'No AI-generated signals available at the moment' 
                : `No AI-generated signals available for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              The AI system analyzes real-time market data and generates intelligent signals automatically
            </div>
            <div className="space-x-4">
              <Button
                onClick={handleRefreshSignals}
                disabled={refreshingSignals}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {refreshingSignals ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating AI Signals...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate AI Signals
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
