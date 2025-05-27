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
import { RefreshCw, Users, Activity, Brain, TestTube, Wrench, Zap, FlaskConical } from 'lucide-react';
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
  const [generatingTestSignals, setGeneratingTestSignals] = useState(false);

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

  const handleGenerateTestSignals = async () => {
    setGeneratingTestSignals(true);
    try {
      console.log('🧪 Generating test signals with reduced confidence requirements...');
      const { data, error } = await supabase.functions.invoke('generate-signals', {
        body: { 
          trigger: 'test',
          test_mode: true
        }
      });
      
      if (error) {
        console.error('❌ Test signal generation error:', error);
        toast({
          title: "Test Signal Error",
          description: "Failed to generate test signals. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Test signal generation result:', data);
      
      const testResults = data.stats || {};
      let message = `Generated ${data.signals?.length || 0} test signals. Success rate: ${testResults.signalSuccessRate || 'unknown'}`;
      
      toast({
        title: "🧪 Test Signals Generated",
        description: message,
      });

      // Refresh signals after generation
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Error generating test signals:', error);
      toast({
        title: "Test Signal Error",
        description: "Failed to generate test signals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingTestSignals(false);
    }
  };

  const handleCleanupCrons = async () => {
    setCleaningCrons(true);
    try {
      console.log('🧹 Setting up automatic signal generation...');
      const { data, error } = await supabase.functions.invoke('cleanup-crons');
      
      if (error) {
        console.error('❌ Automatic setup error:', error);
        toast({
          title: "Setup Error",
          description: "Failed to setup automatic signal generation. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Automatic setup result:', data);
      toast({
        title: "✅ Automatic Generation Active",
        description: "Signals will now be generated automatically every 5 minutes with outcome-based expiration",
      });
    } catch (error) {
      console.error('❌ Error setting up automatic generation:', error);
      toast({
        title: "Setup Error",
        description: "Failed to setup automatic signal generation. Please try again.",
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

      {/* Enhanced Automatic System Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-emerald-400" />
              <span className="text-white font-medium">Automatic Signal Generation</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                OUTCOME-BASED EXPIRATION
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleCleanupCrons}
              disabled={cleaningCrons}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              size="sm"
            >
              {cleaningCrons ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Activate Auto Generation
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          🤖 Automatic mode: Generates signals every 5 minutes • Signals expire only when take profit or stop loss is hit • Continuous signal flow
        </div>
      </div>

      {/* Enhanced System Debugging Panel */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Manual Controls & Testing</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                DEBUG MODE
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleGenerateTestSignals}
              disabled={generatingTestSignals}
              className="bg-green-600 hover:bg-green-700 text-white text-sm"
              size="sm"
            >
              {generatingTestSignals ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Test Mode Signals
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
                  <TestTube className="h-4 w-4 mr-2" />
                  System Test
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          🧪 Manual controls for testing • Test signals use lower thresholds • System diagnostics available
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
                OPENAI GPT-4O-MINI + FASTFOREX
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            🤖 AI Analysis: Real-time market data • Outcome-based signal lifecycle • Intelligent signal generation
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
                AUTOMATIC GENERATION
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
                  Manual Generate
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🧠 All users see identical signals • Expires on outcomes only • Auto-generated every 5 minutes
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
              AI-powered • Outcome monitoring enabled • Enhanced debugging active
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
              The enhanced AI system analyzes real-time market data and generates intelligent signals automatically
            </div>
            <div className="space-x-4">
              <Button
                onClick={handleGenerateTestSignals}
                disabled={generatingTestSignals}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {generatingTestSignals ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Test Signals...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Generate Test Signals
                  </>
                )}
              </Button>
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
              <Button
                onClick={handleComprehensiveTest}
                disabled={testingSystem}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {testingSystem ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing System...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Debug System
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
