import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, Zap, Activity, Award } from 'lucide-react';

export const StrategyPerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategyMetrics();
    const interval = setInterval(fetchStrategyMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchStrategyMetrics = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch all signals from last 30 days with their outcomes
      const { data: signals, error } = await supabase
        .from('trading_signals')
        .select(`
          *,
          signal_outcomes (
            hit_target,
            pnl_pips
          )
        `)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Calculate metrics per strategy
      const trendSignals = signals?.filter(s => s.strategy_type === 'trend_continuation') || [];
      const hsSignals = signals?.filter(s => s.strategy_type === 'head_and_shoulders_reversal') || [];
      const otherSignals = signals?.filter(s => !s.strategy_type || (s.strategy_type !== 'trend_continuation' && s.strategy_type !== 'head_and_shoulders_reversal')) || [];

      const calculateStats = (signalList: any[]) => {
        const withOutcomes = signalList.filter(s => s.signal_outcomes && s.signal_outcomes.length > 0);
        const wins = withOutcomes.filter(s => s.signal_outcomes[0]?.hit_target === true);
        const winRate = withOutcomes.length > 0 ? (wins.length / withOutcomes.length) * 100 : 0;
        const avgPips = withOutcomes.length > 0 
          ? withOutcomes.reduce((sum, s) => sum + (s.signal_outcomes[0]?.pnl_pips || 0), 0) / withOutcomes.length 
          : 0;

        return {
          total: signalList.length,
          completed: withOutcomes.length,
          wins: wins.length,
          losses: withOutcomes.length - wins.length,
          winRate: Math.round(winRate),
          avgPips: Math.round(avgPips)
        };
      };

      const trendStats = calculateStats(trendSignals);
      const hsStats = calculateStats(hsSignals);
      const otherStats = calculateStats(otherSignals);

      setMetrics({
        trend: trendStats,
        headAndShoulders: hsStats,
        other: otherStats,
        overall: {
          total: signals?.length || 0,
          trendCount: trendSignals.length,
          hsCount: hsSignals.length,
          otherCount: otherSignals.length
        }
      });

    } catch (error) {
      console.error('Error fetching strategy metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Loading Strategy Performance...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!metrics) return null;

  const chartData = [
    {
      name: 'Trend Continuation',
      Signals: metrics.trend.total,
      'Win Rate': metrics.trend.winRate,
      'Avg Pips': metrics.trend.avgPips
    },
    {
      name: 'H&S Reversal',
      Signals: metrics.headAndShoulders.total,
      'Win Rate': metrics.headAndShoulders.winRate,
      'Avg Pips': metrics.headAndShoulders.avgPips
    }
  ];

  const pieData = [
    { name: 'Trend Continuation', value: metrics.overall.trendCount, color: '#10b981' },
    { name: 'H&S Reversal', value: metrics.overall.hsCount, color: '#3b82f6' },
    { name: 'Other/Legacy', value: metrics.overall.otherCount, color: '#6b7280' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Dual-Strategy Performance (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Trend Continuation Card */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Trend Continuation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Signals</span>
                  <Badge variant="secondary">{metrics.trend.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <Badge variant="outline">{metrics.trend.completed}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Win Rate</span>
                  <Badge variant={metrics.trend.winRate >= 60 ? 'default' : 'destructive'}>
                    {metrics.trend.winRate}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Avg Pips</span>
                  <Badge variant={metrics.trend.avgPips >= 0 ? 'default' : 'destructive'}>
                    {metrics.trend.avgPips >= 0 ? '+' : ''}{metrics.trend.avgPips}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs font-medium">W/L</span>
                  <span className="text-xs">
                    <span className="text-green-600 font-semibold">{metrics.trend.wins}</span>
                    {' / '}
                    <span className="text-red-600">{metrics.trend.losses}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Head & Shoulders Card */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  H&S Reversal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Signals</span>
                  <Badge variant="secondary">{metrics.headAndShoulders.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <Badge variant="outline">{metrics.headAndShoulders.completed}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Win Rate</span>
                  <Badge variant={metrics.headAndShoulders.winRate >= 60 ? 'default' : 'destructive'}>
                    {metrics.headAndShoulders.winRate}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Avg Pips</span>
                  <Badge variant={metrics.headAndShoulders.avgPips >= 0 ? 'default' : 'destructive'}>
                    {metrics.headAndShoulders.avgPips >= 0 ? '+' : ''}{metrics.headAndShoulders.avgPips}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs font-medium">W/L</span>
                  <span className="text-xs">
                    <span className="text-green-600 font-semibold">{metrics.headAndShoulders.wins}</span>
                    {' / '}
                    <span className="text-red-600">{metrics.headAndShoulders.losses}</span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Overall Stats Card */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-600" />
                  Overall System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Signals</span>
                  <Badge variant="secondary">{metrics.overall.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">New System</span>
                  <Badge variant="default">
                    {metrics.overall.trendCount + metrics.overall.hsCount}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Legacy</span>
                  <Badge variant="outline">{metrics.overall.otherCount}</Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Distribution</div>
                  <div className="flex gap-1">
                    <div 
                      className="h-2 bg-green-500 rounded" 
                      style={{ width: `${(metrics.overall.trendCount / metrics.overall.total) * 100}%` }}
                    />
                    <div 
                      className="h-2 bg-blue-500 rounded" 
                      style={{ width: `${(metrics.overall.hsCount / metrics.overall.total) * 100}%` }}
                    />
                    <div 
                      className="h-2 bg-gray-400 rounded" 
                      style={{ width: `${(metrics.overall.otherCount / metrics.overall.total) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Performance Comparison</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Signals" fill="#8b5cf6" />
                  <Bar dataKey="Win Rate" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Signal Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
