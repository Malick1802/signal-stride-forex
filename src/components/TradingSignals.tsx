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
import { RefreshCw, Users, Activity, Brain, Target, Wrench, Zap, FlaskConical, TrendingUp, Bug, AlertTriangle } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';
import AutomationDashboard from './AutomationDashboard';

// Maximum number of active signals
const MAX_ACTIVE_SIGNALS = 15;

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
  const [debugGenerating, setDebugGenerating] = useState(false);

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
    : 70;

  // Check if any signals are debug signals
  const debugSignalsCount = validSignals.filter(signal => 
    signal.analysisText?.includes('[DEBUG]')
  ).length;
  const hasDebugSignals = debugSignalsCount > 0;

  const handleDebugSignalGeneration = async () => {
    setDebugGenerating(true);
    try {
      console.log('🐛 STARTING DEBUG SIGNAL GENERATION...');
      console.log('🔧 Invoking generate-signals edge function with debug parameters...');
      
      // Enhanced function call with proper error handling and timeout
      const { data, error } = await supabase.functions.invoke('generate-signals', {
        body: { 
          debug_mode: true,
          force_generate: true,
          detailed_logging: true 
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (error) {
        console.error('❌ Debug signal generation failed:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        toast({
          title: "Debug Generation Failed",
          description: `Error: ${error.message || 'Unknown error'}. Check Supabase edge function logs for details.`,
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Debug signal generation completed successfully');
      console.log('📊 Response data:', JSON.stringify(data, null, 2));
      
      // Show detailed results
      const debugInfo = data?.debug_info || {};
      const aiResponses = debugInfo.ai_responses || 0;
      const debugSignals = debugInfo.debug_signals_generated || 0;
      const productionSignals = debugInfo.production_signals_generated || 0;
      const totalAnalyzed = debugInfo.pairs_analyzed || 0;
      
      toast({
        title: "🐛 Debug Generation Complete",
        description: `AI analyzed ${totalAnalyzed} pairs with ${aiResponses} API calls. Generated: ${debugSignals} debug + ${productionSignals} production signals. Check Supabase edge function logs for detailed AI analysis.`,
      });
      
      // Refresh signals after a short delay
      setTimeout(() => {
        console.log('🔄 Refreshing page to show new debug signals...');
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Debug generation error:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      toast({
        title: "Debug Error",
        description: `Failed to run debug signal generation: ${error instanceof Error ? error.message : 'Unknown error'}. Check console and Supabase logs.`,
        variant: "destructive"
      });
    } finally {
      setDebugGenerating(false);
    }
  };

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
        description: "Failed to detect new high-probability opportunities. Please try again.",
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
        <div className="text-white">Loading practical trading signals (analyzing major + minor pairs, limit: {MAX_ACTIVE_SIGNALS})...</div>
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

      {/* URGENT: OpenAI Analysis Debug Panel */}
      <div className="bg-red-500/10 backdrop-blur-sm rounded-xl border border-red-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-white font-medium">OPENAI ANALYSIS DEBUG</span>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                {validSignals.length === 0 ? 'NO SIGNALS GENERATED' : 'READY FOR DEBUG'}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleDebugSignalGeneration}
              disabled={debugGenerating}
              className="bg-red-600 hover:bg-red-700 text-white text-sm"
              size="sm"
            >
              {debugGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Debug Analyzing...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4 mr-2" />
                  Force Debug Analysis
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-red-400">
          🚨 Click "Force Debug Analysis" to trigger detailed OpenAI analysis with debug logging. Check Supabase Edge Function logs for detailed AI responses and confidence levels.
        </div>
      </div>

      {/* Debug Mode Notice */}
      {hasDebugSignals && (
        <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl border border-yellow-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bug className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">DEBUG MODE ACTIVE</span>
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  {debugSignalsCount} DEBUG SIGNALS
                </span>
              </div>
            </div>
            <div className="text-sm text-yellow-400">
              🐛 Debug signals generated with relaxed criteria (55%+ confidence) to verify AI analysis functionality
            </div>
          </div>
        </div>
      )}

      {/* Signal Limit Notice */}
      <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl border border-blue-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">SIGNAL LIMIT: {MAX_ACTIVE_SIGNALS}</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                {validSignals.length}/{MAX_ACTIVE_SIGNALS} ACTIVE
              </span>
            </div>
          </div>
          <div className="text-sm text-blue-400">
            🎯 Maximum {MAX_ACTIVE_SIGNALS} active signals • Major + minor pairs • Practical approach • 60%+ win rate target
          </div>
        </div>
      </div>

      {/* PRACTICAL TRADING Mode Notice */}
      <div className="bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">PRACTICAL TRADING MODE</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                60%+ WIN RATE TARGET
              </span>
              {hasDebugSignals && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  + DEBUG MODE
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-green-400">
            🎯 Major + minor pairs • 65%+ confidence required • 1+ confirmations • Less conservative thresholds
          </div>
        </div>
      </div>

      {/* Enhanced Signal Generation System with Practical Info */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Practical Signal Generation (Max: {MAX_ACTIVE_SIGNALS})</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                LESS CONSERVATIVE
              </span>
              {hasDebugSignals && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  DEBUG MODE
                </span>
              )}
            </div>
            <Button
              onClick={handleDetectOpportunities}
              disabled={detectingOpportunities || validSignals.length >= MAX_ACTIVE_SIGNALS}
              className="bg-green-600 hover:bg-green-700 text-white text-sm"
              size="sm"
            >
              {detectingOpportunities ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing with Practical Thresholds...
                </>
              ) : validSignals.length >= MAX_ACTIVE_SIGNALS ? (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Signal Limit Reached
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Practical Signals
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🎯 {validSignals.length >= MAX_ACTIVE_SIGNALS ? `Limit reached (${validSignals.length}/${MAX_ACTIVE_SIGNALS})` : `${MAX_ACTIVE_SIGNALS - validSignals.length} slots available`} • Practical AI analysis • 65%+ confidence threshold
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
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                PRACTICAL MODE
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
        <div className="mt-2 text-xs text-green-400">
          🎯 PRACTICAL MODE: Less conservative thresholds • Debug criteria (55%+) • Production criteria (65%+) • Maximum {MAX_ACTIVE_SIGNALS} signals
        </div>
      </div>

      {/* AI-Powered Practical Analysis Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Practical AI Analysis System (Limit: {MAX_ACTIVE_SIGNALS})</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                LESS CONSERVATIVE
              </span>
              {hasDebugSignals && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                  DEBUG ACTIVE
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-400">
            🎯 Practical OpenAI analysis with realistic confidence thresholds • Debug mode for 55%+ signals • Production for 65%+ signals
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
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="All" className="bg-gray-800 text-white">All Pairs ({validSignals.length}/{MAX_ACTIVE_SIGNALS})</option>
                {availablePairs.map(pair => (
                  <option key={pair} value={pair} className="bg-gray-800 text-white">
                    {pair} ({validSignals.filter(s => s.pair === pair).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400">
              🎯 Practical signals for major + minor pairs • Maximum {MAX_ACTIVE_SIGNALS} active • Less conservative AI analysis • {hasDebugSignals ? 'Debug mode active' : 'Production mode'}
            </div>
          </div>
        </div>
      )}

      {/* Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? `Practical Signals (${filteredSignals.length}/${MAX_ACTIVE_SIGNALS})` : `${selectedPair} Signals (${filteredSignals.length})`}
          {hasDebugSignals && (
            <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
              {debugSignalsCount} DEBUG
            </span>
          )}
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
                ? `No signals generated yet (0/${MAX_ACTIVE_SIGNALS})` 
                : `No signals for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              🎯 Signal limit: {MAX_ACTIVE_SIGNALS} • Practical AI analysis with less conservative thresholds • 65%+ confidence requirement
            </div>
            <div className="space-x-4">
              <Button
                onClick={handleDetectOpportunities}
                disabled={detectingOpportunities || validSignals.length >= MAX_ACTIVE_SIGNALS}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {detectingOpportunities ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with Practical Thresholds...
                  </>
                ) : validSignals.length >= MAX_ACTIVE_SIGNALS ? (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Signal Limit Reached ({MAX_ACTIVE_SIGNALS})
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate Practical Signals
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
