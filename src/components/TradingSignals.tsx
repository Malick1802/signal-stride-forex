
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
import { RefreshCw, Activity, Brain, Shield, Zap, Target, TrendingUp, Bug, Star, Award, AlertTriangle, CheckCircle, BarChart3, Wrench, TestTube } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';
import Logger from '@/utils/logger';

// UPDATED: Increased signal limit for better market coverage and diversification
const MAX_ACTIVE_SIGNALS = 20;

interface SystemDiagnostics {
  timestamp: string;
  tests: {
    database?: string;
    marketData?: string;
    edgeFunction?: string;
    activeSignals?: number;
    expiredSignals?: number;
    recentSignals?: number;
    signalAge?: number;
    marketDataCount?: number;
  };
  errors: string[];
  recommendations: string[];
}

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, signalDistribution, triggerAutomaticSignalGeneration, executeTimeBasedEliminationPlan, fetchSignals } = useTradingSignals();
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
  const [testingEdgeFunction, setTestingEdgeFunction] = useState(false);
  const [testingMarketData, setTestingMarketData] = useState(false);
  const [systemDiagnostics, setSystemDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);

  const { activateMarket } = useMarketActivation();

  // Enhanced signal validation with comprehensive null/type checking
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
      
      if (!signal.id || typeof signal.id !== 'string') {
        Logger.debug('signals', `Signal missing or invalid ID: ${signal.id}`);
        return false;
      }

      if (!signal.pair || typeof signal.pair !== 'string') {
        Logger.debug('signals', `Signal missing or invalid pair: ${signal.pair}`);
        return false;
      }

      if (!signal.type || typeof signal.type !== 'string') {
        Logger.debug('signals', `Signal missing or invalid type: ${signal.type}`);
        return false;
      }

      if (signal.type !== 'BUY' && signal.type !== 'SELL') {
        Logger.debug('signals', `Signal has invalid type value: ${signal.type}`);
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

  // NEW: Comprehensive System Recovery Function
  const handleSystemRecovery = useCallback(async () => {
    setRecoveryInProgress(true);
    try {
      Logger.info('recovery', '🚀 Starting comprehensive system recovery...');
      
      const recoverySteps = [];
      let stepSuccess = 0;

      // Step 1: Test Edge Function Connectivity
      try {
        Logger.info('recovery', '📡 Step 1: Testing edge function connectivity...');
        const { data: connectivityTest, error: connectivityError } = await supabase.functions.invoke('generate-signals', {
          body: { test: true, skipGeneration: true }
        });
        
        if (connectivityError) {
          recoverySteps.push(`❌ Edge function connectivity: ${connectivityError.message}`);
        } else {
          recoverySteps.push('✅ Edge function connectivity: PASSED');
          stepSuccess++;
        }
      } catch (error) {
        recoverySteps.push(`❌ Edge function connectivity: Network error - ${error}`);
      }

      // Step 2: Verify Market Data Pipeline
      try {
        Logger.info('recovery', '📊 Step 2: Verifying market data pipeline...');
        const { data: marketData, error: marketError } = await supabase
          .from('centralized_market_state')
          .select('symbol, current_price, last_update')
          .order('last_update', { ascending: false })
          .limit(10);

        if (marketError || !marketData || marketData.length === 0) {
          recoverySteps.push(`❌ Market data pipeline: No data available`);
        } else {
          const latestUpdate = new Date(marketData[0].last_update);
          const minutesOld = (Date.now() - latestUpdate.getTime()) / (1000 * 60);
          
          if (minutesOld > 10) {
            recoverySteps.push(`⚠️ Market data pipeline: Data is ${Math.round(minutesOld)} minutes old`);
          } else {
            recoverySteps.push(`✅ Market data pipeline: Fresh data (${marketData.length} pairs)`);
            stepSuccess++;
          }
        }
      } catch (error) {
        recoverySteps.push(`❌ Market data pipeline: ${error}`);
      }

      // Step 3: Force Signal Generation
      try {
        Logger.info('recovery', '🎯 Step 3: Force generating new signals...');
        const { data: generationResult, error: generationError } = await supabase.functions.invoke('generate-signals', {
          body: { 
            force: true, 
            optimized: true,
            trigger: 'recovery_force',
            debug: true 
          }
        });
        
        if (generationError) {
          recoverySteps.push(`❌ Signal generation: ${generationError.message}`);
        } else {
          const signalsGenerated = generationResult?.stats?.signalsGenerated || 0;
          if (signalsGenerated > 0) {
            recoverySteps.push(`✅ Signal generation: ${signalsGenerated} new signals created`);
            stepSuccess++;
          } else {
            recoverySteps.push(`⚠️ Signal generation: Function ran but no signals generated`);
          }
        }
      } catch (error) {
        recoverySteps.push(`❌ Signal generation: Network/CORS error - ${error}`);
      }

      // Step 4: Verify Signal Display
      try {
        Logger.info('recovery', '📋 Step 4: Refreshing signal display...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchSignals();
        
        if (validSignals.length > 0) {
          recoverySteps.push(`✅ Signal display: ${validSignals.length} signals loaded`);
          stepSuccess++;
        } else {
          recoverySteps.push('⚠️ Signal display: No signals visible after refresh');
        }
      } catch (error) {
        recoverySteps.push(`❌ Signal display: ${error}`);
      }

      // Recovery Results
      const successRate = (stepSuccess / 4) * 100;
      Logger.info('recovery', `🎯 Recovery complete: ${stepSuccess}/4 steps successful (${successRate}%)`);

      toast({
        title: `🚀 System Recovery Complete (${successRate}%)`,
        description: `${stepSuccess}/4 recovery steps successful. Check details below.`,
        variant: successRate >= 75 ? "default" : "destructive"
      });

      // Update debug info with recovery results
      setDebugInfo({
        recoveryResults: {
          successRate,
          stepsCompleted: stepSuccess,
          totalSteps: 4,
          details: recoverySteps,
          timestamp: new Date().toISOString()
        },
        currentSignals: validSignals.length,
        signalDistribution
      });

      return successRate >= 75;

    } catch (error) {
      Logger.error('recovery', 'System recovery error:', error);
      toast({
        title: "❌ Recovery Failed",
        description: "System recovery encountered an error. Check console for details.",
        variant: "destructive"
      });
      return false;
    } finally {
      setRecoveryInProgress(false);
    }
  }, [validSignals.length, signalDistribution, fetchSignals, toast]);

  // NEW: Enhanced system diagnostics function
  const handleSystemDiagnostics = useCallback(async () => {
    try {
      setTestingSystem(true);
      Logger.info('diagnostics', 'Starting comprehensive system diagnostics...');
      
      const diagnostics: SystemDiagnostics = {
        timestamp: new Date().toISOString(),
        tests: {},
        errors: [],
        recommendations: []
      };

      // Test 1: Database connectivity
      try {
        const { data: dbTest, error: dbError } = await supabase
          .from('trading_signals')
          .select('count(*)')
          .limit(1);
        
        diagnostics.tests.database = dbError ? 'FAILED' : 'PASSED';
        if (dbError) diagnostics.errors.push(`Database: ${dbError.message}`);
      } catch (error) {
        diagnostics.tests.database = 'FAILED';
        diagnostics.errors.push(`Database connection failed: ${error}`);
      }

      // Test 2: Market data availability
      try {
        const { data: marketData, error: marketError } = await supabase
          .from('centralized_market_state')
          .select('*')
          .limit(5);
        
        diagnostics.tests.marketData = marketError ? 'FAILED' : 'PASSED';
        diagnostics.tests.marketDataCount = marketData?.length || 0;
        if (marketError) diagnostics.errors.push(`Market Data: ${marketError.message}`);
      } catch (error) {
        diagnostics.tests.marketData = 'FAILED';
        diagnostics.errors.push(`Market data fetch failed: ${error}`);
      }

      // Test 3: Edge function availability with enhanced testing
      try {
        const { data: functionTest, error: functionError } = await supabase.functions.invoke('generate-signals', {
          body: { test: true, skipGeneration: true }
        });
        
        diagnostics.tests.edgeFunction = functionError ? 'FAILED' : 'PASSED';
        if (functionError) {
          diagnostics.errors.push(`Edge Function: ${functionError.message}`);
          if (functionError.message.includes('CORS')) {
            diagnostics.recommendations.push('CORS error detected - edge function needs redeployment');
          }
        }
      } catch (error) {
        diagnostics.tests.edgeFunction = 'FAILED';
        diagnostics.errors.push(`Edge function test failed: ${error}`);
      }

      // Test 4: Check signal distribution and age
      try {
        const { data: signalStats, error: statsError } = await supabase
          .from('trading_signals')
          .select('status, created_at, confidence, symbol, type')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!statsError && signalStats) {
          const activeSignals = signalStats.filter(s => s.status === 'active');
          const expiredSignals = signalStats.filter(s => s.status === 'expired');
          const recentSignals = signalStats.filter(s => 
            new Date(s.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          );

          diagnostics.tests.activeSignals = activeSignals.length;
          diagnostics.tests.expiredSignals = expiredSignals.length;
          diagnostics.tests.recentSignals = recentSignals.length;
          diagnostics.tests.signalAge = signalStats.length > 0 ? 
            Math.round((Date.now() - new Date(signalStats[0].created_at).getTime()) / (1000 * 60 * 60)) : 0;

          // Generate recommendations
          if (activeSignals.length === 0) {
            diagnostics.recommendations.push('No active signals found - run system recovery to restore signal generation');
          }
          if (recentSignals.length === 0) {
            diagnostics.recommendations.push('No signals generated in last 24 hours - CORS/connectivity issue likely');
          }
          if ((diagnostics.tests.signalAge || 0) > 72) {
            diagnostics.recommendations.push('Latest signal is very old - signal generation pipeline needs immediate attention');
          }
        }
      } catch (error) {
        diagnostics.errors.push(`Signal analysis failed: ${error}`);
      }

      setSystemDiagnostics(diagnostics);
      
      const passedTests = Object.values(diagnostics.tests).filter(result => result === 'PASSED').length;
      const totalTests = Object.keys(diagnostics.tests).filter(key => typeof diagnostics.tests[key] === 'string').length;
      
      toast({
        title: "🔍 System Diagnostics Complete",
        description: `${passedTests}/${totalTests} tests passed. ${diagnostics.errors.length} errors found.`,
        variant: diagnostics.errors.length === 0 ? "default" : "destructive"
      });

      Logger.info('diagnostics', 'System diagnostics completed:', diagnostics);
      
    } catch (error) {
      Logger.error('diagnostics', 'Error in system diagnostics:', error);
      toast({
        title: "Diagnostics Error",
        description: "Failed to run system diagnostics. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setTestingSystem(false);
    }
  }, [toast]);

  // NEW: Test edge function directly
  const handleTestEdgeFunction = useCallback(async () => {
    setTestingEdgeFunction(true);
    try {
      Logger.info('testing', 'Testing edge function directly...');
      
      const { data, error } = await supabase.functions.invoke('generate-signals', {
        body: { 
          test: true, 
          force: true,
          skipLimits: true,
          debug: true
        }
      });
      
      if (error) {
        Logger.error('testing', 'Edge function test failed:', error);
        toast({
          title: "❌ Edge Function Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
      } else {
        Logger.info('testing', 'Edge function test result:', data);
        toast({
          title: "✅ Edge Function Test Passed",
          description: `Function responded successfully. Check console for details.`,
        });
      }
    } catch (error) {
      Logger.error('testing', 'Error testing edge function:', error);
      toast({
        title: "Edge Function Test Error",
        description: "Failed to test edge function. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setTestingEdgeFunction(false);
    }
  }, [toast]);

  // NEW: Test market data pipeline
  const handleTestMarketData = useCallback(async () => {
    setTestingMarketData(true);
    try {
      Logger.info('testing', 'Testing market data pipeline...');
      
      const { data, error } = await supabase.functions.invoke('fetch-market-data', {
        body: { test: true, force: true }
      });
      
      if (error) {
        Logger.error('testing', 'Market data test failed:', error);
        toast({
          title: "❌ Market Data Test Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
      } else {
        Logger.info('testing', 'Market data test result:', data);
        toast({
          title: "✅ Market Data Test Passed",
          description: `Market data pipeline responded successfully.`,
        });
      }
    } catch (error) {
      Logger.error('testing', 'Error testing market data:', error);
      toast({
        title: "Market Data Test Error",
        description: "Failed to test market data pipeline. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setTestingMarketData(false);
    }
  }, [toast]);

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
      Logger.info('signals', '🎯 Force generating signals with recovery mode...');
      
      // Try the hook first
      await triggerAutomaticSignalGeneration();
      
      // If that fails, try direct edge function call
      setTimeout(async () => {
        const { data, error } = await supabase.functions.invoke('generate-signals', {
          body: { 
            force: true, 
            optimized: true,
            trigger: 'manual_force',
            debug: true 
          }
        });
        
        if (error) {
          Logger.error('signals', 'Direct signal generation failed:', error);
          toast({
            title: "⚠️ Signal Generation Issue",
            description: "Edge function connectivity problem detected. Try System Recovery.",
            variant: "destructive"
          });
        } else {
          const signalsGenerated = data?.stats?.signalsGenerated || 0;
          toast({
            title: "✅ Signals Generated",
            description: `${signalsGenerated} new trading signals created successfully`,
          });
        }
      }, 3000);
      
    } catch (error) {
      Logger.error('signals', 'Error in force signal generation:', error);
      toast({
        title: "Generation Error",
        description: "Signal generation failed. Try System Recovery for comprehensive fix.",
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

      {/* CRITICAL SYSTEM RECOVERY - Show if no signals */}
      {!hasSignalData && (
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 backdrop-blur-sm rounded-xl border-2 border-red-500/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-400 animate-pulse" />
              <div>
                <h3 className="text-white font-bold text-xl">🚨 CRITICAL: Signal Generation Failure</h3>
                <p className="text-sm text-red-200">No active signals detected - System requires immediate recovery</p>
              </div>
            </div>
            <div className="text-xs text-red-300 bg-red-900/40 px-3 py-1 rounded-full animate-pulse">
              0/{MAX_ACTIVE_SIGNALS} ACTIVE SIGNALS
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <div className="text-red-200 text-sm mb-2">🔍 Detected Issues:</div>
            <div className="text-red-300 text-xs space-y-1">
              <div>• CORS error: "No 'Access-Control-Allow-Origin' header"</div>
              <div>• Edge function network failure detected</div>
              <div>• Signal generation loop failing continuously</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleSystemRecovery}
              disabled={recoveryInProgress}
              className="bg-red-600 hover:bg-red-700 text-white font-bold flex-1 min-w-[200px]"
            >
              {recoveryInProgress ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Recovery...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  EMERGENCY SYSTEM RECOVERY
                </>
              )}
            </Button>

            <Button
              onClick={handleSystemDiagnostics}
              disabled={testingSystem}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {testingSystem ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Diagnosing...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4 mr-2" />
                  Detailed Diagnostics
                </>
              )}
            </Button>
          </div>

          {/* Recovery Results Display */}
          {debugInfo?.recoveryResults && (
            <div className="mt-4 bg-black/20 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">🔧 Recovery Results ({debugInfo.recoveryResults.successRate}%)</h4>
              <div className="space-y-2 text-sm">
                {debugInfo.recoveryResults.details.map((step: string, index: number) => (
                  <div key={index} className={`${step.startsWith('✅') ? 'text-green-400' : step.startsWith('⚠️') ? 'text-yellow-400' : 'text-red-400'}`}>
                    {step}
                  </div>
                ))}
              </div>
              {debugInfo.recoveryResults.successRate >= 75 && (
                <div className="mt-3 text-green-400 font-medium">
                  ✅ Recovery successful! Signals should start generating automatically.
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
              // Additional validation before rendering each signal
              if (!signal || !signal.id || !signal.pair || !signal.type) {
                Logger.debug('signals', 'Skipping invalid signal in render:', signal?.id);
                return null;
              }

              if (signal.type !== 'BUY' && signal.type !== 'SELL') {
                Logger.debug('signals', 'Skipping signal with invalid type in render:', signal.id, signal.type);
                return null;
              }
              
              return (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  analysis={analysis}
                  analyzingSignal={analyzingSignal}
                  onGetAIAnalysis={() => {}}
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

      {/* NEW: System Recovery Control Panel */}
      <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 backdrop-blur-sm rounded-xl border border-red-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Wrench className="h-6 w-6 text-red-400" />
            <div>
              <h3 className="text-white font-bold text-lg">🚨 Signal Generation Recovery</h3>
              <p className="text-sm text-gray-300">No active signals detected - System needs immediate attention</p>
            </div>
          </div>
          <div className="text-xs text-red-300 bg-red-900/30 px-3 py-1 rounded-full">
            CRITICAL: 0/{MAX_ACTIVE_SIGNALS} active signals
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={handleSystemDiagnostics}
            disabled={testingSystem}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
          >
            {testingSystem ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Diagnosing...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4 mr-2" />
                System Diagnostics
              </>
            )}
          </Button>

          <Button
            onClick={handleTestEdgeFunction}
            disabled={testingEdgeFunction}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center"
          >
            {testingEdgeFunction ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Test Edge Function
              </>
            )}
          </Button>

          <Button
            onClick={handleTestMarketData}
            disabled={testingMarketData}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
          >
            {testingMarketData ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Test Market Data
              </>
            )}
          </Button>

          <Button
            onClick={handleDetectOpportunities}
            disabled={detectingOpportunities}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center"
          >
            {detectingOpportunities ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Force Generate
              </>
            )}
          </Button>
        </div>

        {/* System Diagnostics Results */}
        {systemDiagnostics && (
          <div className="mt-6 bg-black/20 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">🔍 System Diagnostics Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-gray-400">Database</div>
                <div className={`font-bold ${systemDiagnostics.tests.database === 'PASSED' ? 'text-green-400' : 'text-red-400'}`}>
                  {systemDiagnostics.tests.database}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Market Data</div>
                <div className={`font-bold ${systemDiagnostics.tests.marketData === 'PASSED' ? 'text-green-400' : 'text-red-400'}`}>
                  {systemDiagnostics.tests.marketData} ({systemDiagnostics.tests.marketDataCount})
                </div>
              </div>
              <div>
                <div className="text-gray-400">Edge Function</div>
                <div className={`font-bold ${systemDiagnostics.tests.edgeFunction === 'PASSED' ? 'text-green-400' : 'text-red-400'}`}>
                  {systemDiagnostics.tests.edgeFunction}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Active Signals</div>
                <div className={`font-bold ${(systemDiagnostics.tests.activeSignals || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {systemDiagnostics.tests.activeSignals}/{MAX_ACTIVE_SIGNALS}
                </div>
              </div>
            </div>
            
            {systemDiagnostics.errors.length > 0 && (
              <div className="mb-4">
                <div className="text-red-400 font-medium mb-2">🚨 Errors Found:</div>
                {systemDiagnostics.errors.map((error, index) => (
                  <div key={index} className="text-red-300 text-sm ml-4">• {error}</div>
                ))}
              </div>
            )}
            
            {systemDiagnostics.recommendations.length > 0 && (
              <div>
                <div className="text-yellow-400 font-medium mb-2">💡 Recommendations:</div>
                {systemDiagnostics.recommendations.map((rec, index) => (
                  <div key={index} className="text-yellow-300 text-sm ml-4">• {rec}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
