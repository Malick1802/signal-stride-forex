
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface SignalMetricsProps {
  totalSignals: number;
  expiredSignals: number;
  successRate: number;
  avgPips: number;
  stopLossHits: number;
  takeProfitHits: number;
  avgStopLossSize: number;
  avgTakeProfitSize: number;
  riskRewardRatio: number;
}

const SignalOptimizationMetrics = ({
  totalSignals,
  expiredSignals,
  successRate,
  avgPips,
  stopLossHits,
  takeProfitHits,
  avgStopLossSize,
  avgTakeProfitSize,
  riskRewardRatio
}: SignalMetricsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Signal Performance Optimization</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {successRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {expiredSignals} of {totalSignals} signals completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Win/Loss Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="bg-green-500">
                {takeProfitHits} TP
              </Badge>
              <span>/</span>
              <Badge variant="destructive">
                {stopLossHits} SL
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {takeProfitHits && stopLossHits 
                ? `${(takeProfitHits / Math.max(stopLossHits, 1)).toFixed(1)}:1 ratio` 
                : 'No completed trades'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Risk-Reward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge>1:{riskRewardRatio.toFixed(1)}</Badge>
              {riskRewardRatio < 1.5 ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              SL: {avgStopLossSize} pips / TP: {avgTakeProfitSize} pips
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {avgPips >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              Avg. Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgPips >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {avgPips >= 0 ? '+' : ''}{avgPips} pips
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Active signals:</span>
              <Badge variant="outline">{totalSignals - expiredSignals}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignalOptimizationMetrics;
