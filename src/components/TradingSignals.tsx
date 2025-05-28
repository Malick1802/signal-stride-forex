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
import { RefreshCw, Users, Activity, Brain, TestTube, Wrench, Zap, FlaskConical, Target } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';
import AutomationDashboard from './AutomationDashboard';

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { toast } = useToast();
  
  // Add signal monitoring
  useSignalMonitoring();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [detectingOpportunities, setDetectingOpportunities] = useState(false);
  const [testingSystem, setTestingSystem] = useState(false);
  const [cleaningCrons, setCleaningCrons] = useState(false);

  // Add market activation
  const { activateMarket } = useMarketActivation();

  // Filter out invalid signals
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

  const handleComprehensiveTest = async () => {
    setTestingSystem(true);
    try {
      console.log('🧪 Running comprehensive system test...');
      const { data, error } = await supabase.functions.invoke('test-signal-generation');
      
      if (error) {
        console.error('❌ Comprehensive test error:', error);
        toast({
          title: "Test Error", 
          description: "Comprehensive test failed. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Comprehensive test result:', data);
      
      const testResults = data.tests || {};
      let message = `OpenAI: ${testResults.openAI || 'unknown'}, Market Data: ${testResults.marketData || 0}, Signals: ${testResults.signalsAfterGeneration || 0}`;
      
      toast({
        title: "✅ Comprehensive Test Complete",
        description: message,
      });

      // Refresh signals after test
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Error running comprehensive test:', error);
      toast({
        title: "Test Error",
        description: "Failed to run comprehensive test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTestingSystem(false);
    }
  };

  const handleDetectOpportunities = async () => {
    setDetectingOpportunities(true);
    try {
      await triggerAutomaticSignalGeneration();
    } catch (error) {
      console.error('Error detecting opportunities:', error);
      toast({
        title: "Detection Error",
        description: "Failed to detect new trading opportunities. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDetectingOpportunities(false);
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
        <div className="text-white">Loading individual AI opportunities...</div>
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

      {/* GitHub Actions Automation Dashboard */}
      <AutomationDashboard />

      {/* Global Refresh Status */}
      <GlobalRefreshIndicator />

      {/* Real-time Connection Status */}
      <RealTimeStatus />

      {/* Individual Opportunity Detection System */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Individual Opportunity Detection</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                AI-POWERED
              </span>
            </div>
            <Button
              onClick={handleDetectOpportunities}
              disabled={detectingOpportunities}
              className="bg-green-600 hover:bg-green-700 text-white text-sm"
              size="sm"
            >
              {detectingOpportunities ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Detect Opportunities
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🎯 AI analyzes each pair individually • Only generates signals when genuine opportunities are detected • Adds to existing signals
          </div>
        </div>
      </div>

      {/* System Debugging Panel */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">System Controls</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                PRODUCTION
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
              onClick={handleComprehensiveTest}
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
                  <Zap className="h-4 w-4 mr-2" />
                  Comprehensive Test
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-blue-400">
          🎯 PRODUCTION MODE: Conservative signal generation (10-15% rate) • High confidence thresholds (75-90%) • Selective opportunity detection
        </div>
      </div>

      {/* AI-Powered Individual Detection Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">AI Individual Opportunity System</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                INDIVIDUAL DETECTION
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            🎯 Each pair analyzed individually • Signals generated only when opportunities detected • No batch generation
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
              Individual opportunity detection • Outcome-based expiration • Real-time monitoring
            </div>
          </div>
        </div>
      )}

      {/* Active Individual AI Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? 'Individual AI Opportunities' : `${selectedPair} Opportunities`} ({filteredSignals.length})
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
                ? 'No individual opportunities detected at the moment' 
                : `No opportunities detected for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              The AI system analyzes each currency pair individually and only generates signals when genuine trading opportunities are detected
            </div>
            <div className="space-x-4">
              <Button
                onClick={handleDetectOpportunities}
                disabled={detectingOpportunities}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {detectingOpportunities ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Detecting Opportunities...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Detect New Opportunities
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
