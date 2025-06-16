import React, { useState, memo, useMemo, useCallback } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSystemHealthMonitor } from '@/hooks/useSystemHealthMonitor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, AlertTriangle, CheckCircle, Wrench, Database, Signal, BarChart3, Bug } from 'lucide-react';
import SignalCard from './SignalCard';
import SignalCardLoading from './SignalCardLoading';
import SignalStats from './SignalStats';
import Logger from '@/utils/logger';

interface DiagnosticResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  details: string;
  count?: number;
  errors?: string[];
  recommendations?: string[];
}

interface RecoveryResults {
  success: boolean;
  steps: string[];
  signalsGenerated: number;
  errors: string[];
  marketDataStatus: string;
  edgeFunctionStatus: string;
}

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, signalDistribution, triggerAutomaticSignalGeneration, executeTimeBasedEliminationPlan, fetchSignals } = useTradingSignals();
  const { toast } = useToast();
  
  // Enhanced monitoring systems
  useEnhancedSignalMonitoring();
  const { systemHealth, verifySystemHealth } = useSystemHealthMonitor();
  
  // Recovery system state
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastRecovery, setLastRecovery] = useState<string>('');
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [recoveryResults, setRecoveryResults] = useState<RecoveryResults | null>(null);

  // System diagnostics with enhanced debugging
  const runSystemDiagnostics = useCallback(async () => {
    setIsRunningDiagnostics(true);
    const results: DiagnosticResult[] = [];
    
    try {
      Logger.info('diagnostics', '🔍 Starting comprehensive system diagnostics...');
      
      // Phase 1: Database Connectivity (Fixed query syntax)
      Logger.info('diagnostics', '📊 Testing database connectivity...');
      try {
        const { data: dbTest, error: dbError } = await supabase
          .from('trading_signals')
          .select('id')
          .limit(1);

        if (dbError) {
          results.push({
            name: 'Database',
            status: 'FAILED',
            details: `Database connectivity failed: ${dbError.message}`,
            errors: [dbError.message]
          });
        } else {
          results.push({
            name: 'Database',
            status: 'PASSED',
            details: 'Database connectivity verified'
          });
        }
      } catch (error) {
        results.push({
          name: 'Database',
          status: 'FAILED',
          details: `Database error: ${error}`,
          errors: [String(error)]
        });
      }

      // Phase 2: Market Data Pipeline
      Logger.info('diagnostics', '📈 Checking market data pipeline...');
      try {
        const { data: marketData, error: marketError } = await supabase
          .from('centralized_market_state')
          .select('symbol, current_price, last_update')
          .order('last_update', { ascending: false })
          .limit(5);

        if (marketError || !marketData || marketData.length === 0) {
          results.push({
            name: 'Market Data',
            status: 'FAILED',
            details: 'No market data available',
            errors: marketError ? [marketError.message] : ['No data found'],
            recommendations: ['Check market data stream', 'Verify FastForex API']
          });
        } else {
          const latestUpdate = new Date(marketData[0].last_update);
          const minutesOld = (Date.now() - latestUpdate.getTime()) / (1000 * 60);
          
          if (minutesOld > 10) {
            results.push({
              name: 'Market Data',
              status: 'WARNING',
              details: `Market data is ${Math.round(minutesOld)} minutes old`,
              count: marketData.length,
              recommendations: ['Market data may be stale', 'Check real-time updates']
            });
          } else {
            results.push({
              name: 'Market Data',
              status: 'PASSED',
              details: `Fresh data available (${Math.round(minutesOld)} min old)`,
              count: marketData.length
            });
          }
        }
      } catch (error) {
        results.push({
          name: 'Market Data',
          status: 'FAILED',
          details: `Market data error: ${error}`,
          errors: [String(error)]
        });
      }

      // Phase 3: Edge Function Connectivity
      Logger.info('diagnostics', '🔧 Testing edge function connectivity...');
      try {
        const { data: edgeTest, error: edgeError } = await supabase.functions.invoke('generate-signals', {
          body: { test: true, skipGeneration: true }
        });

        if (edgeError) {
          results.push({
            name: 'Edge Function',
            status: 'FAILED',
            details: `Edge function unreachable: ${edgeError.message}`,
            errors: [edgeError.message],
            recommendations: ['Check function deployment', 'Verify CORS settings']
          });
        } else {
          results.push({
            name: 'Edge Function',
            status: 'PASSED',
            details: 'Edge function responding correctly'
          });
        }
      } catch (error) {
        results.push({
          name: 'Edge Function',
          status: 'FAILED',
          details: `Edge function error: ${error}`,
          errors: [String(error)]
        });
      }

      // Phase 4: Active Signals Analysis
      Logger.info('diagnostics', '📊 Analyzing active signals...');
      try {
        const { data: activeSignals, error: signalsError } = await supabase
          .from('trading_signals')
          .select('id, symbol, status, created_at')
          .eq('status', 'active')
          .eq('is_centralized', true);

        const signalCount = activeSignals?.length || 0;
        const maxSignals = 20;

        if (signalsError) {
          results.push({
            name: 'Active Signals',
            status: 'FAILED',
            details: `Signal query failed: ${signalsError.message}`,
            errors: [signalsError.message]
          });
        } else if (signalCount === 0) {
          results.push({
            name: 'Active Signals',
            status: 'FAILED',
            details: `${signalCount}/${maxSignals}`,
            errors: ['No active signals found'],
            recommendations: ['Run system recovery to restore signal generation', 'Check signal generation pipeline']
          });
        } else if (signalCount < 5) {
          results.push({
            name: 'Active Signals',
            status: 'WARNING',
            details: `${signalCount}/${maxSignals}`,
            count: signalCount,
            recommendations: ['Low signal count', 'Consider running signal generation']
          });
        } else {
          results.push({
            name: 'Active Signals',
            status: 'PASSED',
            details: `${signalCount}/${maxSignals}`,
            count: signalCount
          });
        }

        // Check for recent signal generation
        if (activeSignals && activeSignals.length > 0) {
          const recentSignals = activeSignals.filter(s => {
            const hoursOld = (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60);
            return hoursOld < 24;
          });

          if (recentSignals.length === 0) {
            results.push({
              name: 'Recent Generation',
              status: 'FAILED',
              details: 'No signals generated in last 24 hours',
              errors: ['Signal generation appears stopped'],
              recommendations: ['CORS/connectivity issue likely', 'Run force signal generation']
            });
          }
        }
      } catch (error) {
        results.push({
          name: 'Active Signals',
          status: 'FAILED',
          details: `Signals analysis error: ${error}`,
          errors: [String(error)]
        });
      }

      setDiagnosticResults(results);
      Logger.info('diagnostics', `✅ Diagnostics completed: ${results.length} checks performed`);

    } catch (error) {
      Logger.error('diagnostics', 'Critical diagnostics error:', error);
      results.push({
        name: 'System',
        status: 'FAILED',
        details: `Critical system error: ${error}`,
        errors: [String(error)]
      });
      setDiagnosticResults(results);
    } finally {
      setIsRunningDiagnostics(false);
    }
  }, []);

  // Enhanced system recovery with detailed logging
  const handleSystemRecovery = useCallback(async () => {
    if (isRecovering) return;
    
    setIsRecovering(true);
    setRecoveryResults(null);
    const recoverySteps: string[] = [];
    const errors: string[] = [];
    let signalsGenerated = 0;
    let marketDataStatus = 'Unknown';
    let edgeFunctionStatus = 'Unknown';

    try {
      Logger.info('recovery', '🚨 INITIATING CRITICAL SYSTEM RECOVERY...');
      recoverySteps.push('🚨 System recovery initiated');

      // Step 1: Test edge function connectivity
      Logger.info('recovery', '🔧 Step 1: Testing edge function connectivity...');
      try {
        const { data: testResult, error: testError } = await supabase.functions.invoke('generate-signals', {
          body: { test: true, skipGeneration: true }
        });

        if (testError) {
          edgeFunctionStatus = 'Failed';
          errors.push(`Edge function test failed: ${testError.message}`);
          recoverySteps.push(`❌ Edge function test: ${testError.message}`);
        } else {
          edgeFunctionStatus = 'Connected';
          recoverySteps.push(`✅ Edge function connectivity verified`);
          Logger.info('recovery', 'Edge function test result:', testResult);
        }
      } catch (error) {
        edgeFunctionStatus = 'Error';
        errors.push(`Edge function error: ${error}`);
        recoverySteps.push(`❌ Edge function error: ${error}`);
      }

      // Step 2: Verify market data pipeline
      Logger.info('recovery', '📊 Step 2: Verifying market data pipeline...');
      try {
        const { data: marketData, error: marketError } = await supabase
          .from('centralized_market_state')
          .select('symbol, current_price, last_update')
          .order('last_update', { ascending: false })
          .limit(10);

        if (marketError || !marketData || marketData.length === 0) {
          marketDataStatus = 'No Data';
          errors.push('Market data pipeline: No data available');
          recoverySteps.push(`❌ Market data pipeline: No data available`);
        } else {
          const latestUpdate = new Date(marketData[0].last_update);
          const minutesOld = (Date.now() - latestUpdate.getTime()) / (1000 * 60);
          
          if (minutesOld > 10) {
            marketDataStatus = `Stale (${Math.round(minutesOld)}m)`;
            recoverySteps.push(`⚠️ Market data is ${Math.round(minutesOld)} minutes old`);
          } else {
            marketDataStatus = `Fresh (${Math.round(minutesOld)}m)`;
            recoverySteps.push(`✅ Market data verified: ${marketData.length} pairs, ${Math.round(minutesOld)}m old`);
          }
        }
      } catch (error) {
        marketDataStatus = 'Error';
        errors.push(`Market data error: ${error}`);
        recoverySteps.push(`❌ Market data error: ${error}`);
      }

      // Step 3: Force signal generation with enhanced logging
      Logger.info('recovery', '🎯 Step 3: Force generating signals...');
      try {
        const { data: generateResult, error: generateError } = await supabase.functions.invoke('generate-signals', {
          body: { force: true, debug: true, trigger: 'recovery' }
        });

        if (generateError) {
          errors.push(`Signal generation failed: ${generateError.message}`);
          recoverySteps.push(`❌ Signal generation failed: ${generateError.message}`);
        } else {
          signalsGenerated = generateResult?.stats?.signalsGenerated || 0;
          const totalActive = generateResult?.stats?.totalActiveSignals || 0;
          const signalLimit = generateResult?.stats?.signalLimit || 20;
          
          Logger.info('recovery', 'Signal generation result:', generateResult);
          
          if (signalsGenerated > 0) {
            recoverySteps.push(`✅ Generated ${signalsGenerated} new signals (${totalActive}/${signalLimit} total)`);
          } else {
            recoverySteps.push(`⚠️ No new signals generated (${totalActive}/${signalLimit} total)`);
            
            // Log detailed generation stats for debugging
            if (generateResult?.stats) {
              const stats = generateResult.stats;
              recoverySteps.push(`📊 Generation stats: ${JSON.stringify(stats)}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Signal generation error: ${error}`);
        recoverySteps.push(`❌ Signal generation error: ${error}`);
      }

      // Step 4: Refresh signal display
      Logger.info('recovery', '🔄 Step 4: Refreshing signal display...');
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for signals to propagate
        await fetchSignals();
        recoverySteps.push(`✅ Signal display refreshed`);
      } catch (error) {
        errors.push(`Display refresh error: ${error}`);
        recoverySteps.push(`❌ Display refresh error: ${error}`);
      }

      // Step 5: Verify system health
      Logger.info('recovery', '🛡️ Step 5: Verifying system health...');
      try {
        await verifySystemHealth();
        recoverySteps.push(`✅ System health verification completed`);
      } catch (error) {
        errors.push(`Health verification error: ${error}`);
        recoverySteps.push(`❌ Health verification error: ${error}`);
      }

      const recoveryResult: RecoveryResults = {
        success: errors.length === 0 && signalsGenerated > 0,
        steps: recoverySteps,
        signalsGenerated,
        errors,
        marketDataStatus,
        edgeFunctionStatus
      };

      setRecoveryResults(recoveryResult);
      setLastRecovery(new Date().toLocaleTimeString());

      // Show comprehensive recovery toast
      if (recoveryResult.success) {
        toast({
          title: "🎯 System Recovery Successful",
          description: `Generated ${signalsGenerated} signals. System restored to normal operation.`,
          duration: 6000,
        });
        Logger.info('recovery', `✅ Recovery completed successfully: ${signalsGenerated} signals generated`);
      } else {
        toast({
          title: "⚠️ System Recovery Partial",
          description: `Recovery completed with ${errors.length} issues. Check diagnostics for details.`,
          variant: "destructive",
          duration: 8000,
        });
        Logger.error('recovery', `⚠️ Recovery completed with issues:`, errors);
      }

    } catch (error) {
      Logger.error('recovery', 'Critical recovery error:', error);
      const criticalError = `Critical recovery error: ${error}`;
      errors.push(criticalError);
      recoverySteps.push(`❌ ${criticalError}`);
      
      setRecoveryResults({
        success: false,
        steps: recoverySteps,
        signalsGenerated: 0,
        errors,
        marketDataStatus,
        edgeFunctionStatus
      });

      toast({
        title: "❌ System Recovery Failed",
        description: "Critical recovery error occurred. Check console for details.",
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering, fetchSignals, verifySystemHealth, toast]);

  const signalStats = useMemo(() => {
    const buySignals = signals.filter(signal => signal.type === 'BUY').length;
    const sellSignals = signals.filter(signal => signal.type === 'SELL').length;
    const totalSignals = signals.length;

    return {
      buySignals,
      sellSignals,
      totalSignals,
      lastUpdate,
      signalDistribution
    };
  }, [signals, lastUpdate, signalDistribution]);

  const loadingPlaceholder = useMemo(() => (
    <div className="text-center py-4">
      <RefreshCw className="inline-block h-6 w-6 animate-spin mr-2" />
      Loading Signals...
    </div>
  ), []);

  const noSignalsPlaceholder = useMemo(() => (
    <div className="text-center py-4 text-gray-500">
      <Activity className="inline-block h-6 w-6 mr-2" />
      No signals available at this time.
    </div>
  ), []);

  return (
    <div className="space-y-6">
      <SignalStats stats={signalStats} />
      
      {signals.length === 0 && !loading && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>🚨 Critical System Recovery</span>
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-300">
              No active signals detected. The signal generation system may need recovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* System Diagnostics Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center space-x-2">
                  <Bug className="h-4 w-4" />
                  <span>System Diagnostics</span>
                </h4>
                <Button
                  onClick={runSystemDiagnostics}
                  disabled={isRunningDiagnostics}
                  variant="outline"
                  size="sm"
                >
                  {isRunningDiagnostics ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Run Diagnostics
                    </>
                  )}
                </Button>
              </div>

              {diagnosticResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">🔍 System Diagnostics Results</div>
                  {diagnosticResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{result.name}</span>
                        {result.status === 'PASSED' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {result.status === 'WARNING' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        {result.status === 'FAILED' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="text-sm">
                        <Badge variant={result.status === 'PASSED' ? 'default' : result.status === 'WARNING' ? 'secondary' : 'destructive'}>
                          {result.status}
                          {result.count !== undefined && ` (${result.count})`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {/* Error Summary */}
                  {diagnosticResults.some(r => r.errors?.length) && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                      <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">🚨 Errors Found:</div>
                      {diagnosticResults.filter(r => r.errors?.length).map((result, index) => (
                        <div key={index}>
                          {result.errors?.map((error, errorIndex) => (
                            <div key={errorIndex} className="text-xs text-red-600 dark:text-red-300">
                              • {result.name}: "{error}"
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {diagnosticResults.some(r => r.recommendations?.length) && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">💡 Recommendations:</div>
                      {diagnosticResults.filter(r => r.recommendations?.length).map((result, index) => (
                        <div key={index}>
                          {result.recommendations?.map((rec, recIndex) => (
                            <div key={recIndex} className="text-xs text-blue-600 dark:text-blue-300">
                              • {rec}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="flex space-x-3">
              <Button
                onClick={handleSystemRecovery}
                disabled={isRecovering}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isRecovering ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Recovering System...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Execute System Recovery
                  </>
                )}
              </Button>
              
              <Button
                onClick={triggerAutomaticSignalGeneration}
                disabled={isRecovering}
                variant="outline"
              >
                <Signal className="h-4 w-4 mr-2" />
                Force Generate Signals
              </Button>
            </div>

            {/* Recovery Results Display */}
            {recoveryResults && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded border">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="font-medium">Recovery Results:</span>
                  <Badge variant={recoveryResults.success ? 'default' : 'destructive'}>
                    {recoveryResults.success ? 'SUCCESS' : 'ISSUES FOUND'}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <span className="font-medium">Signals Generated:</span> {recoveryResults.signalsGenerated}
                    </div>
                    <div>
                      <span className="font-medium">Market Data:</span> {recoveryResults.marketDataStatus}
                    </div>
                    <div>
                      <span className="font-medium">Edge Function:</span> {recoveryResults.edgeFunctionStatus}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {recoveryResults.steps.map((step, index) => (
                      <div key={index} className="text-xs font-mono">{step}</div>
                    ))}
                  </div>
                  
                  {recoveryResults.errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <div className="font-medium text-red-700 dark:text-red-400 mb-1">Errors:</div>
                      {recoveryResults.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-600 dark:text-red-300">{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {lastRecovery && (
              <div className="text-xs text-gray-500">
                Last recovery attempt: {lastRecovery}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      
      {/* Signal Grid */}
      {signals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <SignalCardLoading key={i} />
          ))}
        </div>
      )}
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
