
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSignalOutcomeTracker } from '@/hooks/useSignalOutcomeTracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search, AlertTriangle, CheckCircle, Clock, BarChart3, Wrench } from 'lucide-react';
import SignalOptimizationMetrics from './SignalOptimizationMetrics';

interface SignalDebugInfo {
  id: string;
  symbol: string;
  type: string;
  status: string;
  created_at: string;
  price: number;
  stop_loss: number;
  current_price?: number;
  has_outcome: boolean;
  outcome_notes?: string;
  time_since_creation: string;
  takeProfits?: number[];
  slDistance?: number;
  tp1Distance?: number;
}

const SignalDebuggingDashboard = () => {
  const [debugInfo, setDebugInfo] = useState<SignalDebugInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total: 0,
    withOutcomes: 0,
    withoutOutcomes: 0,
    stopLossHits: 0,
    targetHits: 0,
    unknownExits: 0,
    avgStopLossSize: 0,
    avgTakeProfitSize: 0,
    riskRewardRatio: 0,
    avgPips: 0,
    successRate: 0
  });

  const { repairExpiredSignalsWithoutOutcomes } = useSignalOutcomeTracker();

  const calculatePipDistance = (price1: number, price2: number, symbol: string): number => {
    const multiplier = symbol.includes('JPY') ? 100 : 10000;
    return Math.round(Math.abs(price1 - price2) * multiplier);
  };

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      console.log('🔍 DEBUGGING: Fetching signal debug information...');

      // Get all expired signals with their outcome information
      const { data: signals, error } = await supabase
        .from('trading_signals')
        .select(`
          id,
          symbol,
          type,
          status,
          created_at,
          price,
          stop_loss,
          take_profits,
          targets_hit,
          signal_outcomes (
            id,
            notes,
            exit_price,
            pnl_pips,
            target_hit_level
          )
        `)
        .eq('status', 'expired')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ DEBUG ERROR:', error);
        return;
      }

      // Get current market prices
      const symbols = [...new Set(signals?.map(s => s.symbol) || [])];
      const { data: marketData } = await supabase
        .from('centralized_market_state')
        .select('symbol, current_price')
        .in('symbol', symbols);

      const priceMap: Record<string, number> = {};
      marketData?.forEach(data => {
        priceMap[data.symbol] = parseFloat(data.current_price.toString());
      });

      // Process debug information
      const debugData: SignalDebugInfo[] = signals?.map(signal => {
        const hasOutcome = Boolean(signal.signal_outcomes && signal.signal_outcomes.id);
        const outcome = hasOutcome ? signal.signal_outcomes : null;
        
        const createdAt = new Date(signal.created_at);
        const now = new Date();
        const timeDiff = now.getTime() - createdAt.getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        const entryPrice = parseFloat(signal.price.toString());
        const stopLoss = parseFloat(signal.stop_loss.toString());
        
        // Parse take profits and calculate distances
        const takeProfits = signal.take_profits?.map((tp: any) => parseFloat(tp.toString())) || [];
        const slDistance = calculatePipDistance(entryPrice, stopLoss, signal.symbol);
        const tp1Distance = takeProfits[0] ? calculatePipDistance(entryPrice, takeProfits[0], signal.symbol) : 0;
        
        return {
          id: signal.id,
          symbol: signal.symbol,
          type: signal.type,
          status: signal.status,
          created_at: signal.created_at,
          price: entryPrice,
          stop_loss: stopLoss,
          current_price: priceMap[signal.symbol],
          has_outcome: hasOutcome,
          outcome_notes: outcome?.notes || 'No outcome record',
          time_since_creation: `${hours}h ${minutes}m ago`,
          takeProfits,
          slDistance,
          tp1Distance
        };
      }) || [];

      setDebugInfo(debugData);

      // Calculate enhanced stats with risk management metrics
      const total = debugData.length;
      const withOutcomes = debugData.filter(s => s.has_outcome).length;
      const withoutOutcomes = total - withOutcomes;
      const stopLossHits = debugData.filter(s => s.outcome_notes?.includes('Stop Loss')).length;
      const targetHits = debugData.filter(s => s.outcome_notes?.includes('Take Profit')).length;
      const unknownExits = debugData.filter(s => s.outcome_notes?.includes('Unknown') || !s.has_outcome).length;
      
      // Calculate performance metrics
      const allPnl = signals
        .filter(s => s.signal_outcomes?.pnl_pips !== undefined)
        .map(s => s.signal_outcomes.pnl_pips);
      
      const avgPips = allPnl.length > 0 
        ? Math.round(allPnl.reduce((sum, pnl) => sum + pnl, 0) / allPnl.length) 
        : 0;
      
      const successRate = withOutcomes > 0 
        ? Math.round((targetHits / withOutcomes) * 100) 
        : 0;
      
      // Calculate risk management metrics
      const slSizes = debugData.filter(s => s.slDistance).map(s => s.slDistance || 0);
      const tp1Sizes = debugData.filter(s => s.tp1Distance).map(s => s.tp1Distance || 0);
      
      const avgSLSize = slSizes.length > 0 
        ? Math.round(slSizes.reduce((sum, size) => sum + size, 0) / slSizes.length) 
        : 0;
      
      const avgTPSize = tp1Sizes.length > 0 
        ? Math.round(tp1Sizes.reduce((sum, size) => sum + size, 0) / tp1Sizes.length) 
        : 0;
      
      const avgRiskReward = avgSLSize > 0 ? parseFloat((avgTPSize / avgSLSize).toFixed(2)) : 0;

      setStats({
        total,
        withOutcomes,
        withoutOutcomes,
        stopLossHits,
        targetHits,
        unknownExits,
        avgStopLossSize: avgSLSize,
        avgTakeProfitSize: avgTPSize,
        riskRewardRatio: avgRiskReward,
        avgPips,
        successRate
      });

      console.log('✅ DEBUG INFO LOADED:', {
        total,
        withOutcomes,
        withoutOutcomes,
        stopLossHits,
        targetHits,
        unknownExits,
        avgStopLossSize: avgSLSize,
        avgTakeProfitSize: avgTPSize,
        riskRewardRatio: avgRiskReward,
        avgPips,
        successRate
      });

    } catch (error) {
      console.error('❌ DEBUG FETCH ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepairMissingOutcomes = async () => {
    setLoading(true);
    try {
      await repairExpiredSignalsWithoutOutcomes();
      await fetchDebugInfo(); // Refresh data after repair
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <Wrench className="h-4 w-4 mr-2" />
            Optimization
          </TabsTrigger>
        </TabsList>
          
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Expired</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">With Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.withOutcomes}</div>
                <div className="text-xs text-gray-500">
                  {stats.total > 0 ? Math.round((stats.withOutcomes / stats.total) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Missing Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.withoutOutcomes}</div>
                <div className="text-xs text-gray-500">
                  {stats.total > 0 ? Math.round((stats.withoutOutcomes / stats.total) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Stop Loss Hits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.stopLossHits}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Target Hits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.targetHits}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Unknown Exits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.unknownExits}</div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex space-x-4">
            <Button
              onClick={fetchDebugInfo}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Refresh Debug Info
                </>
              )}
            </Button>

            <Button
              onClick={handleRepairMissingOutcomes}
              disabled={loading || stats.withoutOutcomes === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Repairing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Repair Missing Outcomes ({stats.withoutOutcomes})
                </>
              )}
            </Button>
          </div>

          {/* Signal List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expired Signals Debug Info</CardTitle>
              <CardDescription>
                Detailed information about signal expiration and outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {debugInfo.map(signal => (
                  <div
                    key={signal.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="font-medium">{signal.symbol}</div>
                        <div className="text-sm text-gray-500">{signal.time_since_creation}</div>
                      </div>
                      
                      <Badge variant={signal.type === 'BUY' ? 'default' : 'secondary'}>
                        {signal.type}
                      </Badge>

                      <div className="text-sm">
                        <div>Entry: {signal.price.toFixed(5)}</div>
                        <div>SL: {signal.stop_loss.toFixed(5)} ({signal.slDistance} pips)</div>
                        {signal.takeProfits && signal.takeProfits.length > 0 && (
                          <div>TP1: {signal.takeProfits[0].toFixed(5)} ({signal.tp1Distance} pips)</div>
                        )}
                        {signal.current_price && (
                          <div>Current: {signal.current_price.toFixed(5)}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {signal.has_outcome ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <div className="text-sm">
                          <div className={signal.has_outcome ? 'text-green-600' : 'text-red-600'}>
                            {signal.has_outcome ? 'Has Outcome' : 'Missing Outcome'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {signal.outcome_notes}
                          </div>
                        </div>
                      </div>

                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
          
        <TabsContent value="optimization" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Signal Performance Analysis</CardTitle>
                <CardDescription>
                  Key metrics for optimizing trading signal performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignalOptimizationMetrics
                  totalSignals={stats.total}
                  expiredSignals={stats.withOutcomes}
                  successRate={stats.successRate}
                  avgPips={stats.avgPips}
                  stopLossHits={stats.stopLossHits}
                  takeProfitHits={stats.targetHits}
                  avgStopLossSize={stats.avgStopLossSize}
                  avgTakeProfitSize={stats.avgTakeProfitSize}
                  riskRewardRatio={stats.riskRewardRatio}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>
                  System-generated recommendations to improve signal performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h4 className="font-semibold mb-2">Signal Optimization Recommendations</h4>
                  <ul className="space-y-2 text-sm">
                    {stats.riskRewardRatio < 1.5 && (
                      <li className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Improve Risk-Reward Ratio:</strong> Current ratio (1:{stats.riskRewardRatio.toFixed(1)}) is below the recommended 1:1.5 minimum. 
                          Either widen take profit targets or tighten stop losses.
                        </span>
                      </li>
                    )}
                    
                    {stats.avgStopLossSize < 45 && (
                      <li className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Increase Stop Loss Distance:</strong> Average stop loss ({stats.avgStopLossSize} pips) is too tight. 
                          Recommend minimum 45-50 pips to avoid premature stop-outs.
                        </span>
                      </li>
                    )}
                    
                    {stats.avgTakeProfitSize < 70 && (
                      <li className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Increase Take Profit Distance:</strong> First take profit target ({stats.avgTakeProfitSize} pips) is too close.
                          Recommend minimum 70-80 pips for TP1 to improve risk-reward.
                        </span>
                      </li>
                    )}
                    
                    {stats.stopLossHits > stats.targetHits && (
                      <li className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Implement Trailing Stops:</strong> High stop loss hit rate ({stats.stopLossHits}/{stats.withOutcomes} trades).
                          Use trailing stops after TP1 is hit to protect profits.
                        </span>
                      </li>
                    )}
                    
                    {stats.successRate < 50 && stats.withOutcomes > 10 && (
                      <li className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Improve Entry Criteria:</strong> Success rate ({stats.successRate}%) is below target.
                          Consider adding more confirmation factors before signal generation.
                        </span>
                      </li>
                    )}
                    
                    <li className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Volatility-Based Stop Loss:</strong> Implement dynamic stop loss sizing based on current market volatility.
                        Higher volatility should use wider stops to avoid noise.
                      </span>
                    </li>
                    
                    <li className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Technical Level Placement:</strong> Place stops at technical levels rather than fixed pip distances.
                        Use swing points, support/resistance zones, and recent structure.
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalDebuggingDashboard;
