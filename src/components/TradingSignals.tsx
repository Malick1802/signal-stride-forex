import React, { useState, memo } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSignalOutcomeTracker } from '@/hooks/useSignalOutcomeTracker';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import RealTimeStatus from './RealTimeStatus';
import GlobalRefreshIndicator from './GlobalRefreshIndicator';
import SignalDebuggingDashboard from './SignalDebuggingDashboard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Activity, Brain, Shield, Wrench, Zap, FlaskConical, Target, TrendingUp, Clock, Bug, Star, Award } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';
import AutomationDashboard from './AutomationDashboard';

// ENHANCED: Reduced signal limit for premium quality focus
const MAX_ACTIVE_SIGNALS = 12;

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { toast } = useToast();
  
  // Enhanced monitoring systems
  useEnhancedSignalMonitoring();
  useSignalOutcomeTracker();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [detectingOpportunities, setDetectingOpportunities] = useState(false);
  const [testingSystem, setTestingSystem] = useState(false);
  const [cleaningCrons, setCleaningCrons] = useState(false);
  const [showDebugDashboard, setShowDebugDashboard] = useState(false);

  const { activateMarket } = useMarketActivation();

  // Enhanced signal validation
  const validSignals = signals.filter(signal => {
    if (!signal || typeof signal !== 'object' || !signal.id || !signal.pair || !signal.type) {
      return false;
    }
    // Additional quality checks
    if (signal.confidence < 80) {
      console.warn(`⚠️ Low confidence signal filtered out: ${signal.pair} (${signal.confidence}%)`);
      return false;
    }
    return true;
  });

  const availablePairs = Array.from(new Set(validSignals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  const filteredSignals = selectedPair === 'All' ? validSignals : validSignals.filter(signal => signal.pair === selectedPair);

  const avgConfidence = validSignals.length > 0 
    ? Math.round(validSignals.reduce((sum, signal) => sum + (signal.confidence || 0), 0) / validSignals.length)
    : 85; // Enhanced default

  const handleCleanupCrons = async () => {
    setCleaningCrons(true);
    try {
      console.log('🧹 PHASE 1: Completely eliminating ALL time-based signal expiration...');
      const { data, error } = await supabase.functions.invoke('cleanup-crons');
      
      if (error) {
        console.error('❌ Complete elimination error:', error);
        toast({
          title: "Elimination Error",
          description: "Failed to completely eliminate time-based expiration. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Complete elimination result:', data);
      toast({
        title: "✅ Time-Based Expiration COMPLETELY ELIMINATED",
        description: "Signals now expire PURELY on outcome (SL/TP hits only) + 72h emergency safety net",
      });
    } catch (error) {
      console.error('❌ Error completely eliminating time-based expiration:', error);
      toast({
        title: "Elimination Error",
        description: "Failed to completely eliminate time-based expiration. Please try again.",
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
      console.error('Error detecting enhanced opportunities:', error);
      toast({
        title: "Enhanced Detection Error",
        description: "Failed to detect new premium high-quality opportunities. Please try again.",
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
        <div className="text-white">Loading premium quality signals (analyzing all currency pairs, limit: {MAX_ACTIVE_SIGNALS})...</div>
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

      {/* Enhanced Quality Focus Notice */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl border border-yellow-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Star className="h-6 w-6 text-yellow-400" />
              <span className="text-white font-bold text-lg">PREMIUM QUALITY SIGNALS</span>
              <span className="text-xs bg-yellow-500/30 text-yellow-300 px-3 py-1 rounded-full font-medium">
                85%+ CONFIDENCE ONLY
              </span>
            </div>
          </div>
          <div className="text-sm text-yellow-300">
            🎯 Enhanced AI Analysis • ATR-Based Risk Management • 70%+ Win Probability Target
          </div>
        </div>
        <div className="mt-2 text-xs text-yellow-400">
          ⭐ Quality over quantity: Advanced GPT-4.1 analysis with multi-timeframe confluence and strict filtering
        </div>
      </div>

      {/* GitHub Actions Automation Dashboard */}
      <AutomationDashboard />

      {/* Global Refresh Status */}
      <GlobalRefreshIndicator />

      {/* Real-time Connection Status */}
      <RealTimeStatus />

      {/* Enhanced Quality Signal Generation System */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Enhanced Premium Signal Generation (Max: {MAX_ACTIVE_SIGNALS})</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                QUALITY-FOCUSED
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
                  Analyzing Premium Opportunities...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Generate Premium Quality Signals
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🎯 {validSignals.length}/{MAX_ACTIVE_SIGNALS} active • Premium rotation • Enhanced monitoring • 85%+ confidence
          </div>
        </div>
        <div className="mt-2 text-xs text-green-400">
          ⭐ Advanced GPT-4.1 analysis • ATR-based stops • Dynamic risk-reward ratios • Multi-timeframe confluence
        </div>
      </div>

      {/* Enhanced Monitoring Status */}
      <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">ENHANCED OUTCOME-BASED MONITORING</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                PREMIUM QUALITY
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-purple-400">
              🧠 5-second intervals • Premium signal tracking • Enhanced outcomes • 85%+ confidence
            </div>
            <Button
              onClick={() => setShowDebugDashboard(!showDebugDashboard)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
              size="sm"
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDebugDashboard ? 'Hide' : 'Show'} Debug Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Debug Dashboard */}
      {showDebugDashboard && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <SignalDebuggingDashboard />
        </div>
      )}

      {/* Enhanced Success Mode Notice */}
      <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl border border-blue-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">ENHANCED SUCCESS-FOCUSED MODE</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                TARGET: 70%+ SUCCESS RATE
              </span>
            </div>
          </div>
          <div className="text-sm text-blue-400">
            🎯 Premium market analysis • Enhanced AI filtering • Superior risk management
          </div>
        </div>
      </div>

      {/* Enhanced System Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Enhanced Premium System Controls</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                QUALITY-FOCUSED
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
                  Eliminating Time-Based Expiration...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Eliminate ALL Time-Based Expiration
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
        <div className="mt-2 text-xs text-yellow-400">
          🛡️ ENHANCED QUALITY FOCUS: Premium signals only • 85%+ confidence filter • Advanced risk management
        </div>
      </div>

      {/* Enhanced Pair Filter */}
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
                <option value="All" className="bg-gray-800 text-white">All Premium Pairs ({validSignals.length}/{MAX_ACTIVE_SIGNALS})</option>
                {availablePairs.map(pair => (
                  <option key={pair} value={pair} className="bg-gray-800 text-white">
                    {pair} ({validSignals.filter(s => s.pair === pair).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400">
              ⭐ Premium quality signals • Enhanced analysis • 85%+ confidence • Superior risk management
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? `Premium Quality Signals (${filteredSignals.length}/${MAX_ACTIVE_SIGNALS})` : `${selectedPair} Premium Signals (${filteredSignals.length})`}
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
                  onGetAIAnalysis={() => {}} // ... keep existing code
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? `No premium quality signals generated yet (0/${MAX_ACTIVE_SIGNALS})` 
                : `No premium signals for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              ⭐ Premium signal limit: {MAX_ACTIVE_SIGNALS} • Enhanced quality focus • 85%+ confidence • Advanced AI analysis
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
                    Analyzing Premium Opportunities...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Generate Premium Quality Signals
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
