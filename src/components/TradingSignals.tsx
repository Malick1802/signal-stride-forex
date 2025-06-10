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
import { RefreshCw, Activity, Brain, Shield, Zap, Target, TrendingUp, Bug, Star, Award, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';
import AutomationDashboard from './AutomationDashboard';

// UPDATED: Increased signal limit for better market coverage and diversification
const MAX_ACTIVE_SIGNALS = 20;

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration, executeTimeBasedEliminationPlan } = useTradingSignals();
  const { toast } = useToast();
  
  // Enhanced monitoring systems
  useEnhancedSignalMonitoring();
  useSignalOutcomeTracker();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [detectingOpportunities, setDetectingOpportunities] = useState(false);
  const [testingSystem, setTestingSystem] = useState(false);
  const [eliminatingTimeBased, setEliminatingTimeBased] = useState(false);
  const [showDebugDashboard, setShowDebugDashboard] = useState(false);

  const { activateMarket } = useMarketActivation();

  // Signal validation with practical criteria
  const validSignals = signals.filter(signal => {
    if (!signal || typeof signal !== 'object' || !signal.id || !signal.pair || !signal.type) {
      return false;
    }
    // Quality checks (65%+ confidence)
    if (signal.confidence < 65) {
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
    : 70;

  const handleEliminateTimeBasedExpiration = async () => {
    setEliminatingTimeBased(true);
    try {
      console.log('🔥 EXECUTING TIME-BASED EXPIRATION ELIMINATION PLAN...');
      const success = await executeTimeBasedEliminationPlan();
      
      if (success) {
        console.log('✅ TIME-BASED EXPIRATION ELIMINATION COMPLETE');
        toast({
          title: "🎯 TIME-BASED EXPIRATION ELIMINATED",
          description: "Signals now expire PURELY on outcome (SL/TP hits) + 72h emergency safety only",
        });
      }
    } catch (error) {
      console.error('❌ Error executing elimination plan:', error);
      toast({
        title: "Elimination Plan Error",
        description: "Failed to eliminate time-based expiration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setEliminatingTimeBased(false);
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
      console.error('Error detecting practical opportunities:', error);
      toast({
        title: "Practical Detection Error",
        description: "Failed to detect new practical opportunities. Please try again.",
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
        <div className="text-white">Loading practical signals (analyzing all currency pairs, limit: {MAX_ACTIVE_SIGNALS})...</div>
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

      {/* CRITICAL: Time-Based Expiration Elimination Alert */}
      <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <span className="text-white font-bold text-lg">CRITICAL: TIME-BASED EXPIRATION ACTIVE</span>
              <span className="text-xs bg-red-500/30 text-red-300 px-3 py-1 rounded-full font-medium">
                SIGNALS EXPIRING AFTER 4 HOURS
              </span>
            </div>
            <Button
              onClick={handleEliminateTimeBasedExpiration}
              disabled={eliminatingTimeBased}
              className="bg-red-600 hover:bg-red-700 text-white text-sm"
              size="sm"
            >
              {eliminatingTimeBased ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminating Time-Based Expiration...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  EXECUTE ELIMINATION PLAN
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-red-400">
          ⚠️ Cron job #10 ("expire-old-signals") is causing automatic 4-hour expiration, interfering with outcome-based system
        </div>
      </div>

      {/* UPDATED: Quality Focus Notice with new signal limit */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <span className="text-white font-bold text-lg">PRACTICAL SIGNALS ({MAX_ACTIVE_SIGNALS} MAX)</span>
              <span className="text-xs bg-green-500/30 text-green-300 px-3 py-1 rounded-full font-medium">
                65%+ CONFIDENCE • 15 PIP TP1 • 40 PIP MIN SL
              </span>
            </div>
          </div>
          <div className="text-sm text-green-300">
            🎯 AI Analysis • Risk Management • 55%+ Win Probability Target
          </div>
        </div>
        <div className="mt-2 text-xs text-green-400">
          ⭐ Quality focus: Advanced GPT-4.1 analysis • EXCELLENT/GOOD/FAIR grades accepted • Up to {MAX_ACTIVE_SIGNALS} signals
        </div>
      </div>

      {/* GitHub Actions Automation Dashboard */}
      <AutomationDashboard />

      {/* Global Refresh Status */}
      <GlobalRefreshIndicator />

      {/* Real-time Connection Status */}
      <RealTimeStatus />

      {/* UPDATED: Signal Generation System with new limit */}
      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl border border-blue-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Practical Signal Generation (Max: {MAX_ACTIVE_SIGNALS})</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                QUALITY-FOCUSED
              </span>
            </div>
            <Button
              onClick={handleDetectOpportunities}
              disabled={detectingOpportunities}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              size="sm"
            >
              {detectingOpportunities ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Opportunities...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Generate Quality Signals
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🎯 {validSignals.length}/{MAX_ACTIVE_SIGNALS} active • Rotation • Monitoring • 65%+ confidence
          </div>
        </div>
        <div className="mt-2 text-xs text-blue-400">
          ⭐ GPT-4.1 analysis • ATR-based stops • Risk-reward ratios • Multi-timeframe confluence
        </div>
      </div>

      {/* IMPROVED: RELAXED Monitoring Status */}
      <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">RELAXED OUTCOME-BASED MONITORING</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                RELAXED QUALITY
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-purple-400">
              🧠 5-second intervals • Relaxed signal tracking • Practical outcomes • 65%+ confidence
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

      {/* IMPROVED: RELAXED Success Mode Notice */}
      <div className="bg-cyan-500/10 backdrop-blur-sm rounded-xl border border-cyan-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              <span className="text-white font-medium">RELAXED SUCCESS-FOCUSED MODE</span>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
                TARGET: 55-65% SUCCESS RATE
              </span>
            </div>
          </div>
          <div className="text-sm text-cyan-400">
            🎯 Relaxed market analysis • Practical AI filtering • Achievable risk management
          </div>
        </div>
      </div>

      {/* IMPROVED: RELAXED System Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">RELAXED Quality System Controls</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                RELAXED-FOCUSED
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
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
          🛡️ RELAXED QUALITY FOCUS: Practical signals • 65%+ confidence filter • Achievable risk management
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
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              ⭐ Quality signals • Practical analysis • 65%+ confidence • Achievable risk management
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? `Quality Signals (${filteredSignals.length}/${MAX_ACTIVE_SIGNALS})` : `${selectedPair} Signals (${filteredSignals.length})`}
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
                  onGetAIAnalysis={() => handleGetAIAnalysis(signal.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? `No practical signals generated yet (0/${MAX_ACTIVE_SIGNALS})` 
                : `No signals for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              ⭐ Signal limit: {MAX_ACTIVE_SIGNALS} • Quality focus • 65%+ confidence • AI analysis
            </div>
            <div className="space-x-4">
              <Button
                onClick={handleDetectOpportunities}
                disabled={detectingOpportunities}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {detectingOpportunities ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Opportunities...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Generate Quality Signals
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

}
