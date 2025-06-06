
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { calculateSignalPerformance } from '@/utils/pipCalculator';

interface SignalPerformanceData {
  id: string;
  symbol: string;
  type: string;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  distance: {
    toSL: number;
    toTP1: number;
    toTP2: number;
    toTP3: number; 
  };
  ratio: {
    rr1: number;
    rr2: number;
    rr3: number;
  };
  outcome?: {
    exitPrice: number;
    pnlPips: number;
    success: boolean;
    note: string;
    exitTime: string;
    targetHit?: number;
  };
  created_at: string;
}

interface PerformanceStats {
  totalSignals: number;
  expiredSignals: number;
  winRate: number;
  avgPips: number;
  stopLossHits: number;
  takeProfit1Hits: number;
  takeProfit2Hits: number;
  takeProfit3Hits: number;
  avgStopLossDistance: number;
  avgTpDistance: number;
  avgRiskReward: number;
}

const calculatePipDistance = (price1: number, price2: number, symbol: string): number => {
  const multiplier = symbol.includes('JPY') ? 100 : 10000;
  return Math.round(Math.abs(price1 - price2) * multiplier);
};

const calculateRiskReward = (slPips: number, tpPips: number): number => {
  if (slPips === 0) return 0;
  return parseFloat((tpPips / slPips).toFixed(2));
};

const SignalOptimizationDashboard = () => {
  const [signals, setSignals] = useState<SignalPerformanceData[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalSignals: 0,
    expiredSignals: 0,
    winRate: 0,
    avgPips: 0,
    stopLossHits: 0,
    takeProfit1Hits: 0,
    takeProfit2Hits: 0,
    takeProfit3Hits: 0,
    avgStopLossDistance: 0,
    avgTpDistance: 0,
    avgRiskReward: 0
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchSignalPerformanceData = async () => {
    setLoading(true);
    try {
      // Get signals with their outcomes in a single query
      const { data: signalsData, error } = await supabase
        .from('trading_signals')
        .select(`
          id,
          symbol,
          type,
          price,
          stop_loss,
          take_profits,
          created_at,
          status,
          is_centralized,
          signal_outcomes (
            id,
            hit_target,
            exit_price,
            pnl_pips,
            target_hit_level,
            notes,
            exit_timestamp
          )
        `)
        .eq('is_centralized', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching signal performance data:', error);
        return;
      }

      // Transform data for analysis
      const processedData: SignalPerformanceData[] = signalsData
        .filter(signal => signal.take_profits?.length > 0)
        .map(signal => {
          const entryPrice = parseFloat(signal.price.toString());
          const stopLoss = parseFloat(signal.stop_loss.toString());
          const takeProfits = signal.take_profits?.map(tp => parseFloat(tp.toString())) || [];
          
          // Calculate distances in pips
          const slDistance = calculatePipDistance(entryPrice, stopLoss, signal.symbol);
          const tp1Distance = takeProfits[0] ? calculatePipDistance(entryPrice, takeProfits[0], signal.symbol) : 0;
          const tp2Distance = takeProfits[1] ? calculatePipDistance(entryPrice, takeProfits[1], signal.symbol) : 0;
          const tp3Distance = takeProfits[2] ? calculatePipDistance(entryPrice, takeProfits[2], signal.symbol) : 0;
          
          // Calculate risk-reward ratios
          const rr1 = calculateRiskReward(slDistance, tp1Distance);
          const rr2 = calculateRiskReward(slDistance, tp2Distance);
          const rr3 = calculateRiskReward(slDistance, tp3Distance);
          
          // Process outcome if available
          let outcome = undefined;
          
          if (signal.signal_outcomes && signal.status === 'expired') {
            const outcomeData = signal.signal_outcomes;
            outcome = {
              exitPrice: parseFloat(outcomeData.exit_price.toString()),
              pnlPips: outcomeData.pnl_pips,
              success: outcomeData.hit_target,
              note: outcomeData.notes || '',
              exitTime: outcomeData.exit_timestamp,
              targetHit: outcomeData.target_hit_level
            };
          }

          return {
            id: signal.id,
            symbol: signal.symbol,
            type: signal.type,
            entryPrice,
            stopLoss,
            takeProfits,
            distance: {
              toSL: slDistance,
              toTP1: tp1Distance,
              toTP2: tp2Distance,
              toTP3: tp3Distance
            },
            ratio: {
              rr1,
              rr2,
              rr3
            },
            outcome,
            created_at: signal.created_at
          };
        });

      setSignals(processedData);
      
      // Calculate overall statistics
      const expiredSignals = processedData.filter(s => s.outcome);
      const successfulSignals = expiredSignals.filter(s => s.outcome?.success);
      const pipsGained = expiredSignals.reduce((sum, s) => sum + (s.outcome?.pnlPips || 0), 0);
      
      const slHits = expiredSignals.filter(s => !s.outcome?.success).length;
      const tp1Hits = expiredSignals.filter(s => s.outcome?.targetHit === 1).length;
      const tp2Hits = expiredSignals.filter(s => s.outcome?.targetHit === 2).length;
      const tp3Hits = expiredSignals.filter(s => s.outcome?.targetHit === 3).length;
      
      const avgSLDistance = processedData.reduce((sum, s) => sum + s.distance.toSL, 0) / processedData.length;
      const avgTP1Distance = processedData.reduce((sum, s) => sum + s.distance.toTP1, 0) / processedData.length;
      
      setStats({
        totalSignals: processedData.length,
        expiredSignals: expiredSignals.length,
        winRate: expiredSignals.length > 0 ? Math.round((successfulSignals.length / expiredSignals.length) * 100) : 0,
        avgPips: expiredSignals.length > 0 ? Math.round(pipsGained / expiredSignals.length) : 0,
        stopLossHits: slHits,
        takeProfit1Hits: tp1Hits,
        takeProfit2Hits: tp2Hits,
        takeProfit3Hits: tp3Hits,
        avgStopLossDistance: Math.round(avgSLDistance),
        avgTpDistance: Math.round(avgTP1Distance),
        avgRiskReward: processedData.reduce((sum, s) => sum + s.ratio.rr1, 0) / processedData.length
      });
      
    } catch (error) {
      console.error('Error processing signal performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignalPerformanceData();
  }, []);

  const filteredSignals = activeTab === 'all' 
    ? signals 
    : activeTab === 'expired' 
      ? signals.filter(s => s.outcome)
      : activeTab === 'active'
        ? signals.filter(s => !s.outcome)
        : activeTab === 'success'
          ? signals.filter(s => s.outcome?.success)
          : activeTab === 'failure'
            ? signals.filter(s => s.outcome && !s.outcome.success)
            : signals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Signal Optimization Dashboard</h2>
        <Button 
          onClick={fetchSignalPerformanceData} 
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      
      {/* Performance Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.expiredSignals} out of {stats.totalSignals} signals complete
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Pips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.avgPips >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {stats.avgPips >= 0 ? '+' : ''}{stats.avgPips}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.stopLossHits} SL hits vs. {stats.takeProfit1Hits + stats.takeProfit2Hits + stats.takeProfit3Hits} TP hits
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk-Reward</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              1:{stats.avgRiskReward.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              SL: {stats.avgStopLossDistance} pips / TP: {stats.avgTpDistance} pips
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">TP Hits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <div className="text-sm">
                <span className="text-xl font-bold text-emerald-500">{stats.takeProfit1Hits}</span>
                <span className="text-xs block">TP1</span>
              </div>
              <div className="text-sm">
                <span className="text-xl font-bold text-emerald-600">{stats.takeProfit2Hits}</span>
                <span className="text-xs block">TP2</span>
              </div>
              <div className="text-sm">
                <span className="text-xl font-bold text-emerald-700">{stats.takeProfit3Hits}</span>
                <span className="text-xs block">TP3</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs <span className="text-red-500 font-medium">{stats.stopLossHits}</span> SL hits
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Signal Analysis Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Signals</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="success">Successful</TabsTrigger>
          <TabsTrigger value="failure">Stop Loss Hits</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Signal Analysis ({filteredSignals.length})</CardTitle>
              <CardDescription>
                Detailed analysis of signal performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredSignals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No signals found in this category
                  </div>
                ) : (
                  filteredSignals.map(signal => (
                    <div 
                      key={signal.id} 
                      className={`p-4 border ${signal.outcome?.success ? 'border-emerald-200 bg-emerald-50/10' : signal.outcome ? 'border-red-200 bg-red-50/10' : 'border-gray-200'} rounded-lg`}
                    >
                      <div className="flex flex-wrap justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold">{signal.symbol}</h3>
                            <Badge variant={signal.type === 'BUY' ? 'default' : 'secondary'}>
                              {signal.type}
                            </Badge>
                            {signal.outcome && (
                              <Badge variant={signal.outcome.success ? "success" : "destructive"}>
                                {signal.outcome.success ? `TP${signal.outcome.targetHit} Hit` : 'SL Hit'}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <span className="text-muted-foreground">Entry:</span> {signal.entryPrice.toFixed(5)} | 
                            <span className="text-muted-foreground ml-2">SL:</span> {signal.stopLoss.toFixed(5)} | 
                            <span className="text-muted-foreground ml-2">TP1:</span> {signal.takeProfits[0]?.toFixed(5)}
                          </div>
                          
                          <div className="flex space-x-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">SL Distance:</span> {signal.distance.toSL} pips
                            </div>
                            <div>
                              <span className="text-muted-foreground">TP1 Distance:</span> {signal.distance.toTP1} pips
                            </div>
                            <div>
                              <span className="text-muted-foreground">Risk-Reward:</span> 1:{signal.ratio.rr1}
                            </div>
                          </div>
                        </div>
                        
                        {signal.outcome && (
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className={`text-lg font-bold ${signal.outcome.pnlPips >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {signal.outcome.pnlPips >= 0 ? '+' : ''}{signal.outcome.pnlPips} pips
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Exit: {signal.outcome.exitPrice.toFixed(5)}
                              </div>
                            </div>
                            
                            {signal.outcome.success ? (
                              <Target className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {signal.outcome && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {signal.outcome.note}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignalOptimizationDashboard;
