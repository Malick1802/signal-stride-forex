
import React from 'react';
import { TrendingUp, TrendingDown, Target, RefreshCw } from 'lucide-react';
import { useExpiredSignals } from '@/hooks/useExpiredSignals';
import { Button } from '@/components/ui/button';

const ExpiredSignals = () => {
  const { expiredSignals, stats, loading, refetch } = useExpiredSignals();

  const getResultColor = (result: string) => {
    switch (result) {
      case 'WIN': return 'text-emerald-400 bg-emerald-400/20';
      case 'LOSS': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'WIN': return <TrendingUp className="h-4 w-4" />;
      case 'LOSS': return <TrendingDown className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading completed signals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">{stats.totalSignals}</div>
          <div className="text-gray-400 text-sm">Completed Signals</div>
          <div className="text-emerald-400 text-xs mt-1">Finished trades</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-blue-400 text-2xl font-bold">{stats.winRate}%</div>
          <div className="text-gray-400 text-sm">Win Rate</div>
          <div className="text-blue-400 text-xs mt-1">{stats.wins} wins / {stats.totalSignals} total</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className={`text-2xl font-bold ${stats.avgPips >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.avgPips >= 0 ? '+' : ''}{stats.avgPips} pips
          </div>
          <div className="text-gray-400 text-sm">Avg Pips</div>
          <div className={`text-xs mt-1 ${stats.avgPips >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Per signal
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-orange-400 text-2xl font-bold">{stats.avgDuration}</div>
          <div className="text-gray-400 text-sm">Avg Duration</div>
          <div className="text-orange-400 text-xs mt-1">Per signal</div>
        </div>
      </div>

      {/* Completed Signals List */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Completed Signals History</h2>
            <p className="text-gray-400 text-sm">Signals that reached stop loss or take profit levels</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {expiredSignals.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Completed Signals</h3>
            <p className="text-gray-400">No signals have been completed yet. Signals will appear here when they hit their stop loss or take profit levels.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {expiredSignals.map((signal) => (
              <div key={signal.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-bold text-lg">{signal.pair}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        signal.type === 'BUY' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {signal.type}
                      </span>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded ${getResultColor(signal.result)}`}>
                      {getResultIcon(signal.result)}
                      <span className="text-xs font-medium">{signal.result}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      signal.pips.includes('+') ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {signal.pips}
                    </div>
                    <div className="text-gray-400 text-sm">{signal.duration}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 mb-1">Entry Price</div>
                    <div className="text-white font-mono">{signal.entryPrice}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Exit Price</div>
                    <div className="text-white font-mono">{signal.exitPrice}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Stop Loss</div>
                    <div className="text-red-400 font-mono">{signal.stopLoss}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Take Profit</div>
                    <div className="text-emerald-400 font-mono">{signal.takeProfit}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Confidence</div>
                    <div className="text-blue-400 font-medium">{signal.confidence}%</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Target className="h-4 w-4" />
                      <span>Completed: {signal.expiredAt}</span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    Outcome: <span className="text-white">{signal.reason}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiredSignals;
