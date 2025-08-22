import React from 'react';
import { Activity, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMobileSignalMonitoring } from '@/hooks/useMobileSignalMonitoring';

export const MobileSignalMonitor: React.FC = () => {
  const { activeSignals, signalUpdates, signalPerformance } = useMobileSignalMonitoring();

  const getSignalStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'expired': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getPipsColor = (pips: number) => {
    if (pips > 0) return 'text-emerald-400';
    if (pips < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-4 p-4">
      {/* Performance Summary */}
      <Card className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Signal Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{signalPerformance.totalSignals}</div>
              <div className="text-sm text-muted-foreground">Active Signals</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPipsColor(signalPerformance.totalPips)}`}>
                {signalPerformance.totalPips > 0 ? '+' : ''}{signalPerformance.totalPips}
              </div>
              <div className="text-sm text-muted-foreground">Total Pips</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                {signalPerformance.winRate}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Updates */}
      {signalUpdates.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signalUpdates.slice(-3).reverse().map((update, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">{update.symbol}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getSignalStatusColor(update.status)}`}
                    >
                      {update.status}
                    </Badge>
                  </div>
                  {update.current_pips && (
                    <span className={`text-sm font-mono ${getPipsColor(update.current_pips)}`}>
                      {update.current_pips > 0 ? '+' : ''}{update.current_pips} pips
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Signals Summary */}
      <Card className="bg-slate-800/30 border-slate-600">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            Active Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSignals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active signals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeSignals.slice(0, 5).map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/20">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={signal.type === 'BUY' ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}
                    >
                      {signal.type}
                    </Badge>
                    <span className="text-sm font-medium">{signal.symbol}</span>
                  </div>
                  <div className="text-right">
                    {signal.current_pips && (
                      <div className={`text-sm font-mono ${getPipsColor(signal.current_pips)}`}>
                        {signal.current_pips > 0 ? '+' : ''}{signal.current_pips} pips
                      </div>
                    )}
                    {signal.targets_hit && signal.targets_hit.length > 0 && (
                      <div className="text-xs text-emerald-400">
                        TP{Math.max(...signal.targets_hit)} hit
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activeSignals.length > 5 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    +{activeSignals.length - 5} more signals
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};