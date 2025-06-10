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
import { RefreshCw, Users, Activity, Brain, Shield, Wrench, Zap, FlaskConical, Target, TrendingUp, Clock, Bug } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';
import AutomationDashboard from './AutomationDashboard';

// Maximum number of active signals
const MAX_ACTIVE_SIGNALS = 20; // Increased from 15

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { toast } = useToast();
  
  // Add enhanced monitoring systems
  useEnhancedSignalMonitoring();
  useSignalOutcomeTracker();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [detectingOpportunities, setDetectingOpportunities] = useState(false);
  const [testingSystem, setTestingSystem] = useState(false);
  const [cleaningCrons, setCleaningCrons] = useState(false);
  const [showDebugDashboard, setShowDebugDashboard] = useState(false);

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
    : 75;

  const handleCleanupCrons = async () => {
    setCleaningCrons(true);
    try {
      console.log('🧹 Eliminating time-based signal expiration...');
      const { data, error } = await supabase.functions.invoke('cleanup-crons');
      
      if (error) {
        console.error('❌ Enhanced cleanup error:', error);
        toast({
          title: "Cleanup Error",
          description: "Failed to eliminate time-based expiration. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Enhanced cleanup result:', data);
      toast({
        title: "✅ Time-Based Expiration Eliminated",
        description: "Signals will now expire naturally based on market conditions only (72h emergency timeout)",
      });
    } catch (error) {
      console.error('❌ Error eliminating time-based expiration:', error);
      toast({
        title: "Cleanup Error",
        description: "Failed to eliminate time-based expiration. Please try again.",
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
        description: "Failed to detect new enhanced success-focused opportunities. Please try again.",
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
        <div className="text-white">Loading market-based signals (analyzing all currency pairs, limit: {MAX_ACTIVE_SIGNALS})...</div>
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

      {/* Enhanced Monitoring Status */}
      <div className="bg-purple-500/10 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-white font-medium">ENHANCED SIGNAL MONITORING</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                ACTIVE
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-purple-400">
              🧠 5-second intervals • Real-time triggers • Outcome validation
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

      {/* Market-Based Expiration Notice */}
      <div className="bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">MARKET-BASED SIGNAL EXPIRATION</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                ENHANCED MONITORING
              </span>
            </div>
          </div>
          <div className="text-sm text-green-400">
            🎯 Enhanced validation • Mandatory outcomes • 5-second monitoring
          </div>
        </div>
      </div>

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
            🎯 Market-driven outcomes • Natural signal lifecycle • No artificial time limits
          </div>
        </div>
      </div>

      {/* Enhanced System Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Enhanced System Controls</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                MARKET-BASED MONITORING
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
                  Eliminate Time-Based Expiration
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
          🛡️ MARKET-BASED EXPIRATION: Signals expire naturally based on market conditions • 72h emergency safety net only
        </div>
      </div>

      {/* Enhanced Success-Focused Signal Generation System */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Enhanced Success-Focused Signal Generation (Max: {MAX_ACTIVE_SIGNALS})</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                WITH INTELLIGENT ROTATION
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
                  Analyzing Enhanced Opportunities...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Enhanced Success Signals
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🧠 {validSignals.length}/{MAX_ACTIVE_SIGNALS} active • Intelligent rotation • Enhanced monitoring • Validated outcomes
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
              🎯 Market-based signals • Natural expiration • 72h emergency timeout only
            </div>
          </div>
        </div>
      )}

      {/* Active Enhanced Success Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? `Market-Based Signals (${filteredSignals.length}/${MAX_ACTIVE_SIGNALS})` : `${selectedPair} Signals (${filteredSignals.length})`}
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
                ? `No market-based signals generated yet (0/${MAX_ACTIVE_SIGNALS})` 
                : `No signals for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              🎯 Signal limit: {MAX_ACTIVE_SIGNALS} • Market-based expiration • Natural lifecycle based on price action • Intelligent rotation
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
                    Analyzing Market-Based Opportunities...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate Market-Based Signals
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
