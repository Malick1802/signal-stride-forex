
import React, { useState, memo, useMemo, useCallback } from 'react';
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
import { RefreshCw, Activity, Brain, Shield, Zap, Target, TrendingUp, Bug, Star, Award, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';
import Logger from '@/utils/logger';

// UPDATED: Increased signal limit for better market coverage and diversification
const MAX_ACTIVE_SIGNALS = 20;

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, signalDistribution, triggerAutomaticSignalGeneration, executeTimeBasedEliminationPlan } = useTradingSignals();
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
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const { activateMarket } = useMarketActivation();

  // Memoized signal validation with proper loading state handling
  const validSignals = useMemo(() => {
    // Prevent filtering during initial load to avoid race condition
    if (loading || !signals || signals.length === 0) {
      Logger.debug('signals', `Signal filtering skipped - loading: ${loading}, signals: ${signals?.length || 0}`);
      return [];
    }

    const filtered = signals.filter(signal => {
      if (!signal) {
        Logger.debug('signals', 'Null signal filtered out');
        return false;
      }
      
      if (typeof signal !== 'object') {
        Logger.debug('signals', `Non-object signal filtered out: ${typeof signal}`);
        return false;
      }
      
      if (!signal.id || !signal.pair || !signal.type) {
        Logger.debug('signals', `Signal missing required properties: ${signal.id} ${signal.pair} ${signal.type}`);
        return false;
      }
      
      // Quality checks (65%+ confidence)
      if (signal.confidence < 65) {
        Logger.debug('signals', `Low confidence signal filtered out: ${signal.pair} (${signal.confidence}%)`);
        return false;
      }
      
      return true;
    });

    Logger.info('signals', `Signal filtering results: ${filtered.length}/${signals.length} valid signals`);
    return filtered;
  }, [signals, loading]);

  // Memoized available pairs to prevent unnecessary recalculations
  const availablePairs = useMemo(() => {
    return Array.from(new Set(validSignals.map(signal => signal.pair))).filter(Boolean);
  }, [validSignals]);

  const [selectedPair, setSelectedPair] = useState('All');

  // Memoized filtered signals
  const filteredSignals = useMemo(() => {
    return selectedPair === 'All' ? validSignals : validSignals.filter(signal => signal.pair === selectedPair);
  }, [selectedPair, validSignals]);

  // Memoized average confidence calculation
  const avgConfidence = useMemo(() => {
    return validSignals.length > 0 
      ? Math.round(validSignals.reduce((sum, signal) => sum + (signal.confidence || 0), 0) / validSignals.length)
      : 70;
  }, [validSignals]);

  // Calculate signal type difference (for monitoring, not balancing)
  const signalDifference = Math.abs(signalDistribution.buy - signalDistribution.sell);
  const hasStrongBias = signalDifference >= 5;

  const handleInvestigateSignalExpiration = useCallback(async () => {
    try {
      Logger.info('signals', 'Investigating signal expiration...');
      
      // Check total signals in database
      const { data: allSignals, error: allSignalsError } = await supabase
        .from('trading_signals')
        .select('id, status, created_at, symbol, confidence, type')
        .order('created_at', { ascending: false })
        .limit(50);

      if (allSignalsError) {
        Logger.error('signals', 'Error fetching all signals:', allSignalsError);
        toast({
          title: "❌ Investigation Error",
          description: "Failed to fetch signals from database",
          variant: "destructive"
        });
        return;
      }

      // Check active vs expired signals
      const activeCount = allSignals?.filter(s => s.status === 'active').length || 0;
      const expiredCount = allSignals?.filter(s => s.status === 'expired').length || 0;
      const activeBuyCount = allSignals?.filter(s => s.status === 'active' && s.type === 'BUY').length || 0;
      const activeSellCount = allSignals?.filter(s => s.status === 'active' && s.type === 'SELL').length || 0;
      const recentSignals = allSignals?.slice(0, 10) || [];
      
      const debugData = {
        totalSignals: allSignals?.length || 0,
        activeSignals: activeCount,
        expiredSignals: expiredCount,
        activeBuySignals: activeBuyCount,
        activeSellSignals: activeSellCount,
        recentSignals: recentSignals,
        highConfidenceSignals: allSignals?.filter(s => s.confidence >= 65).length || 0,
        centralizedSignals: allSignals?.filter(s => s.status === 'active').length || 0
      };
      
      setDebugInfo(debugData);
      
      toast({
        title: "🔍 Investigation Complete",
        description: `Found ${activeCount} active (BUY: ${activeBuyCount}, SELL: ${activeSellCount}), ${expiredCount} expired signals out of ${allSignals?.length || 0} total.`,
      });

      // Show recommendations based on findings
      if (activeCount === 0 && expiredCount > 0) {
        Logger.warn('signals', 'All signals expired - time-based expiration likely active');
        toast({
          title: "⚠️ Time-Based Expiration Detected",
          description: "All signals expired - recommend running elimination plan and generating new signals",
          variant: "destructive"
        });
      }

    } catch (error) {
      Logger.error('signals', 'Investigation error:', error);
      toast({
        title: "Investigation Error",
        description: "Failed to investigate signal expiration. Check console for details.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleEliminateTimeBasedExpiration = async () => {
    setEliminatingTimeBased(true);
    try {
      Logger.info('signals', 'Executing comprehensive time-based expiration elimination...');
      const success = await executeTimeBasedEliminationPlan();
      
      if (success) {
        Logger.info('signals', 'Time-based expiration elimination complete');
        toast({
          title: "🎯 TIME-BASED EXPIRATION COMPLETELY ELIMINATED",
          description: "All cron jobs removed. Signals now expire PURELY on market outcomes (SL/TP) + 72h emergency safety only",
        });
      }
    } catch (error) {
      Logger.error('signals', 'Error executing comprehensive elimination:', error);
      toast({
        title: "Elimination Error",
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
      Logger.info('signals', 'Running comprehensive system test...');
      const { data, error } = await supabase.functions.invoke('test-signal-generation');
      
      if (error) {
        Logger.error('signals', 'Comprehensive test error:', error);
        toast({
          title: "Test Error", 
          description: "Comprehensive test failed. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      Logger.info('signals', 'Comprehensive test result:', data);
      
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
      Logger.error('signals', 'Error running comprehensive test:', error);
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
      Logger.error('signals', 'Error detecting pure market opportunities:', error);
      toast({
        title: "Market Detection Error",
        description: "Failed to detect new market opportunities. Please try again.",
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
        Logger.error('signals', 'AI analysis error:', error);
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
      Logger.error('signals', 'Error getting AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to get additional AI analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzingSignal(null);
    }
  };

  // Show loading state during initial load to prevent race condition
  if (loading && validSignals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading pure market signals (analyzing all currency pairs, limit: {MAX_ACTIVE_SIGNALS})...</div>
      </div>
    );
  }

  const hasSignalData = validSignals.length > 0;

  return (
    <div className="space-y-6">
      {/* Global Refresh Status */}
      <GlobalRefreshIndicator />

      {/* Real-time Connection Status */}
      <RealTimeStatus />

      {/* Signal Statistics Overview */}
      <SignalStats 
        signalsCount={validSignals.length}
        avgConfidence={avgConfidence}
        lastUpdate={lastUpdate || 'Never'}
      />

      {/* Natural Signal Type Distribution Display */}
      {hasSignalData && (
        <div className={`backdrop-blur-sm rounded-xl border p-4 ${
          hasStrongBias 
            ? 'bg-blue-900/20 border-blue-500/30' 
            : 'bg-emerald-900/20 border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className={`h-5 w-5 ${hasStrongBias ? 'text-blue-400' : 'text-emerald-400'}`} />
              <div>
                <h3 className="text-white font-medium">Natural Signal Distribution</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-400">BUY: {signalDistribution.buy}</span>
                  <span className="text-red-400">SELL: {signalDistribution.sell}</span>
                  <span className={`${hasStrongBias ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {hasStrongBias ? `Market bias: ${signalDistribution.buy > signalDistribution.sell ? 'Bullish' : 'Bearish'}` : 'Balanced market'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-300">
              📊 Pure technical analysis • Market-driven distribution
            </div>
          </div>
        </div>
      )}

      {/* Investigation Control */}
      <div className="bg-amber-900/20 backdrop-blur-sm rounded-xl border border-amber-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bug className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-white font-medium">Signal Investigation</h3>
              <p className="text-sm text-gray-400">Investigate signal status and natural distribution</p>
            </div>
          </div>
          <Button
            onClick={handleInvestigateSignalExpiration}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Bug className="h-4 w-4 mr-2" />
            Investigate Signal Status
          </Button>
        </div>
        
        {debugInfo && (
          <div className="mt-4 bg-black/20 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Investigation Results:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Total Signals</div>
                <div className="text-white font-bold">{debugInfo.totalSignals}</div>
              </div>
              <div>
                <div className="text-gray-400">Active</div>
                <div className="text-emerald-400 font-bold">{debugInfo.activeSignals}</div>
              </div>
              <div>
                <div className="text-gray-400">BUY / SELL</div>
                <div className="text-blue-400 font-bold">{debugInfo.activeBuySignals} / {debugInfo.activeSellSignals}</div>
              </div>
              <div>
                <div className="text-gray-400">Expired</div>
                <div className="text-red-400 font-bold">{debugInfo.expiredSignals}</div>
              </div>
            </div>
            {debugInfo.activeSignals === 0 && debugInfo.expiredSignals > 0 && (
              <div className="mt-2">
                <div className="text-red-400 text-sm font-medium">⚠️ All signals are expired - Time-based expiration likely active</div>
                <div className="text-yellow-300 text-xs">
                  Recommendation: Run elimination plan, then generate new signals
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Time-Based Expiration Elimination Control */}
      <div className="bg-red-900/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-red-400" />
            <div>
              <h3 className="text-white font-medium">Time-Based Expiration Control</h3>
              <p className="text-sm text-gray-400">Eliminate automatic time-based signal expiration (keep only market-based outcomes)</p>
            </div>
          </div>
          <Button
            onClick={handleEliminateTimeBasedExpiration}
            disabled={eliminatingTimeBased}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {eliminatingTimeBased ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Eliminating...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Eliminate Time-Based Expiration
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Debug Dashboard */}
      {showDebugDashboard && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <SignalDebuggingDashboard />
        </div>
      )}

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
              📊 Pure technical analysis • Natural distribution • No forced balancing
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? 
            `Pure Market Signals (${filteredSignals.length}/${MAX_ACTIVE_SIGNALS}) - BUY: ${signalDistribution.buy}, SELL: ${signalDistribution.sell}` : 
            `${selectedPair} Signals (${filteredSignals.length})`
          }
        </h3>
        
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignals.map(signal => {
              if (!signal || !signal.id) {
                Logger.debug('signals', 'Skipping invalid signal in render:', signal?.id);
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
                ? `No pure market signals generated yet (0/${MAX_ACTIVE_SIGNALS})` 
                : `No signals for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              📊 Signal limit: {MAX_ACTIVE_SIGNALS} • Pure technical analysis • Natural distribution • No forced balancing
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
                    Analyzing Market Opportunities...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Generate Pure Market Signals
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
