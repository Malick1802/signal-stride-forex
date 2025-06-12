
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
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const { activateMarket } = useMarketActivation();

  // ENHANCED: Comprehensive signal validation with professional forex standards
  const validSignals = signals.filter(signal => {
    // First-level null/undefined check
    if (!signal) {
      console.warn('🚫 Null/undefined signal filtered out');
      return false;
    }
    
    // Type validation
    if (typeof signal !== 'object') {
      console.warn('🚫 Non-object signal filtered out:', typeof signal);
      return false;
    }
    
    // Essential property validation
    const requiredProps = ['id', 'pair', 'type', 'entryPrice'];
    const missingProps = requiredProps.filter(prop => !signal[prop as keyof typeof signal]);
    
    if (missingProps.length > 0) {
      console.warn('🚫 Signal missing required properties:', {
        id: signal.id,
        pair: signal.pair,
        type: signal.type,
        entryPrice: signal.entryPrice,
        missingProps
      });
      return false;
    }
    
    // Professional forex quality standards (65%+ confidence)
    if (signal.confidence < 65) {
      console.warn(`⚠️ Low confidence signal filtered out: ${signal.pair} (${signal.confidence}%)`);
      return false;
    }
    
    // Price validation for forex pairs
    const entryPrice = parseFloat(signal.entryPrice);
    if (isNaN(entryPrice) || entryPrice <= 0) {
      console.warn(`❌ Invalid entry price for ${signal.pair}: ${signal.entryPrice}`);
      return false;
    }
    
    console.log(`✅ Professional forex signal validated: ${signal.pair} ${signal.type} (${signal.confidence}%)`);
    return true;
  });

  console.log(`📊 Professional signal filtering: ${validSignals.length}/${signals.length} valid signals`);

  const availablePairs = Array.from(new Set(validSignals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  const filteredSignals = selectedPair === 'All' ? validSignals : validSignals.filter(signal => signal.pair === selectedPair);

  const avgConfidence = validSignals.length > 0 
    ? Math.round(validSignals.reduce((sum, signal) => sum + (signal.confidence || 0), 0) / validSignals.length)
    : 70;

  const handleInvestigateSignalExpiration = async () => {
    try {
      console.log('🔍 PROFESSIONAL INVESTIGATION: Analyzing signal expiration patterns...');
      
      // Check total signals with enhanced debugging
      const { data: allSignals, error: allSignalsError } = await supabase
        .from('trading_signals')
        .select('id, status, created_at, symbol, confidence, is_centralized')
        .eq('is_centralized', true)
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (allSignalsError) {
        console.error('❌ Investigation error:', allSignalsError);
        toast({
          title: "❌ Investigation Error",
          description: "Failed to fetch signals for professional analysis",
          variant: "destructive"
        });
        return;
      }

      // Professional analysis of signal patterns
      const activeCount = allSignals?.filter(s => s.status === 'active').length || 0;
      const expiredCount = allSignals?.filter(s => s.status === 'expired').length || 0;
      const recentSignals = allSignals?.slice(0, 10) || [];
      const highConfidenceSignals = allSignals?.filter(s => s.confidence >= 65).length || 0;
      
      console.log(`📊 PROFESSIONAL ANALYSIS RESULTS:
        - Total signals analyzed: ${allSignals?.length || 0}
        - Active professional signals: ${activeCount}
        - Expired signals: ${expiredCount}
        - High confidence signals (65%+): ${highConfidenceSignals}
        - Recent signal sample:`, recentSignals);

      const debugData = {
        totalSignals: allSignals?.length || 0,
        activeSignals: activeCount,
        expiredSignals: expiredCount,
        recentSignals: recentSignals,
        highConfidenceSignals: highConfidenceSignals,
        professionalSignals: activeCount
      };
      
      setDebugInfo(debugData);
      
      toast({
        title: "🔍 Professional Analysis Complete",
        description: `Found ${activeCount} active, ${expiredCount} expired signals. ${highConfidenceSignals} high-confidence signals detected.`,
      });

      // Professional recommendations
      if (activeCount === 0 && expiredCount > 0) {
        console.log('⚠️ PROFESSIONAL RECOMMENDATION: Time-based expiration detected - requires elimination');
        toast({
          title: "⚠️ Time-Based Expiration Active",
          description: "Professional analysis suggests running elimination plan and generating new signals",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('❌ Professional investigation error:', error);
      toast({
        title: "Investigation Error",
        description: "Professional analysis failed. Check console for details.",
        variant: "destructive"
      });
    }
  };

  const handleEliminateTimeBasedExpiration = async () => {
    setEliminatingTimeBased(true);
    try {
      console.log('🔥 EXECUTING COMPREHENSIVE TIME-BASED EXPIRATION ELIMINATION...');
      const success = await executeTimeBasedEliminationPlan();
      
      if (success) {
        console.log('✅ COMPREHENSIVE TIME-BASED EXPIRATION ELIMINATION COMPLETE');
        toast({
          title: "🎯 TIME-BASED EXPIRATION COMPLETELY ELIMINATED",
          description: "All cron jobs removed. Signals now expire PURELY on market outcomes (SL/TP) + 72h emergency safety only",
        });
      }
    } catch (error) {
      console.error('❌ Error executing comprehensive elimination:', error);
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
      console.log('🧪 Running comprehensive professional forex system test...');
      const { data, error } = await supabase.functions.invoke('test-signal-generation');
      
      if (error) {
        console.error('❌ Professional test error:', error);
        toast({
          title: "Test Error", 
          description: "Professional forex system test failed. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Professional test result:', data);
      
      const testResults = data.tests || {};
      let message = `OpenAI Professional Analysis: ${testResults.openAI || 'unknown'}, Market Data: ${testResults.marketData || 0}, Professional Signals: ${testResults.signalsAfterGeneration || 0}`;
      
      toast({
        title: "✅ Professional Test Complete",
        description: message,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Error running professional test:', error);
      toast({
        title: "Test Error",
        description: "Failed to run professional forex system test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTestingSystem(false);
    }
  };

  const handleDetectOpportunities = async () => {
    setDetectingOpportunities(true);
    try {
      console.log('🎯 Detecting professional forex opportunities with enhanced AI analysis...');
      await triggerAutomaticSignalGeneration();
    } catch (error) {
      console.error('Error detecting professional opportunities:', error);
      toast({
        title: "Professional Detection Error",
        description: "Failed to detect new professional forex opportunities. Please try again.",
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
        <div className="text-white">Loading professional forex signals (analyzing technical indicators, limit: {MAX_ACTIVE_SIGNALS})...</div>
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

      {/* Professional Investigation Control */}
      <div className="bg-amber-900/20 backdrop-blur-sm rounded-xl border border-amber-500/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-white font-medium">Professional Signal Analysis</h3>
              <p className="text-sm text-gray-400">Advanced investigation of signal patterns with technical indicators</p>
            </div>
          </div>
          <Button
            onClick={handleInvestigateSignalExpiration}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Brain className="h-4 w-4 mr-2" />
            Professional Analysis
          </Button>
        </div>
        
        {debugInfo && (
          <div className="mt-4 bg-black/20 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Professional Analysis Results:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Total Signals</div>
                <div className="text-white font-bold">{debugInfo.totalSignals}</div>
              </div>
              <div>
                <div className="text-gray-400">Active Professional</div>
                <div className="text-emerald-400 font-bold">{debugInfo.activeSignals}</div>
              </div>
              <div>
                <div className="text-gray-400">High Confidence (65%+)</div>
                <div className="text-blue-400 font-bold">{debugInfo.highConfidenceSignals}</div>
              </div>
              <div>
                <div className="text-gray-400">Expired</div>
                <div className="text-red-400 font-bold">{debugInfo.expiredSignals}</div>
              </div>
            </div>
            {debugInfo.activeSignals === 0 && debugInfo.expiredSignals > 0 && (
              <div className="mt-2">
                <div className="text-red-400 text-sm font-medium">⚠️ Time-based expiration active - Professional recommendation: eliminate and regenerate</div>
                <div className="text-yellow-300 text-xs">
                  Technical indicators suggest fresh analysis needed
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
              ⭐ Professional analysis • RSI • MACD • Bollinger • EMAs
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? `Professional Forex Signals (${filteredSignals.length}/${MAX_ACTIVE_SIGNALS})` : `${selectedPair} Signals (${filteredSignals.length})`}
        </h3>
        
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignals.map(signal => {
              if (!signal || !signal.id) {
                console.warn('🚫 Skipping invalid signal in render:', signal);
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
                ? `No professional forex signals generated yet (0/${MAX_ACTIVE_SIGNALS})` 
                : `No signals for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              ⭐ Professional Analysis: RSI • MACD • Bollinger Bands • 50/200 EMA • ATR • News Sentiment
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
                    Analyzing Professional Opportunities...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Professional Signals
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
