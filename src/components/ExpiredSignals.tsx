
import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Target, Shield, DollarSign } from 'lucide-react';

const ExpiredSignals = () => {
  const [expiredSignals, setExpiredSignals] = useState([]);

  useEffect(() => {
    // Mock expired signals data
    const mockExpiredSignals = [
      {
        id: 1,
        pair: 'EURUSD',
        type: 'BUY',
        entryPrice: 1.0876,
        exitPrice: 1.0920,
        stopLoss: 1.0825,
        takeProfit: 1.0950,
        confidence: 92,
        result: 'WIN',
        pnl: '+$244.00',
        duration: '3h 24m',
        expiredAt: '2024-05-24 14:30:00',
        reason: 'Take Profit Hit'
      },
      {
        id: 2,
        pair: 'GBPUSD',
        type: 'SELL',
        entryPrice: 1.2654,
        exitPrice: 1.2680,
        stopLoss: 1.2720,
        takeProfit: 1.2580,
        confidence: 87,
        result: 'LOSS',
        pnl: '-$130.00',
        duration: '1h 45m',
        expiredAt: '2024-05-24 12:15:00',
        reason: 'Stop Loss Hit'
      },
      {
        id: 3,
        pair: 'USDJPY',
        type: 'BUY',
        entryPrice: 153.45,
        exitPrice: 153.82,
        stopLoss: 152.90,
        takeProfit: 154.20,
        confidence: 89,
        result: 'WIN',
        pnl: '+$185.00',
        duration: '5h 12m',
        expiredAt: '2024-05-24 10:45:00',
        reason: 'Take Profit Hit'
      },
      {
        id: 4,
        pair: 'AUDUSD',
        type: 'SELL',
        entryPrice: 0.6543,
        exitPrice: 0.6520,
        stopLoss: 0.6580,
        takeProfit: 0.6480,
        confidence: 85,
        result: 'WIN',
        pnl: '+$115.00',
        duration: '2h 38m',
        expiredAt: '2024-05-24 09:22:00',
        reason: 'Take Profit Hit'
      },
      {
        id: 5,
        pair: 'USDCAD',
        type: 'BUY',
        entryPrice: 1.3642,
        exitPrice: 1.3625,
        stopLoss: 1.3590,
        takeProfit: 1.3700,
        confidence: 78,
        result: 'EXPIRED',
        pnl: '$0.00',
        duration: '24h 00m',
        expiredAt: '2024-05-24 08:00:00',
        reason: 'Time Expired'
      }
    ];

    setExpiredSignals(mockExpiredSignals);
  }, []);

  const getResultColor = (result) => {
    switch (result) {
      case 'WIN': return 'text-emerald-400 bg-emerald-400/20';
      case 'LOSS': return 'text-red-400 bg-red-400/20';
      case 'EXPIRED': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'WIN': return <TrendingUp className="h-4 w-4" />;
      case 'LOSS': return <TrendingDown className="h-4 w-4" />;
      case 'EXPIRED': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">156</div>
          <div className="text-gray-400 text-sm">Total Signals</div>
          <div className="text-emerald-400 text-xs mt-1">Last 30 days</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-blue-400 text-2xl font-bold">89%</div>
          <div className="text-gray-400 text-sm">Win Rate</div>
          <div className="text-blue-400 text-xs mt-1">139 wins / 156 total</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-purple-400 text-2xl font-bold">+$4,250</div>
          <div className="text-gray-400 text-sm">Total P&L</div>
          <div className="text-purple-400 text-xs mt-1">+12.5% ROI</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-orange-400 text-2xl font-bold">4h 20m</div>
          <div className="text-gray-400 text-sm">Avg Duration</div>
          <div className="text-orange-400 text-xs mt-1">Per signal</div>
        </div>
      </div>

      {/* Expired Signals List */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Expired Signals History</h2>
          <p className="text-gray-400 text-sm">Complete history of closed trading signals</p>
        </div>

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
                    signal.result === 'WIN' ? 'text-emerald-400' : 
                    signal.result === 'LOSS' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {signal.pnl}
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
                    <Clock className="h-4 w-4" />
                    <span>Expired: {signal.expiredAt}</span>
                  </div>
                </div>
                <div className="text-gray-400">
                  Reason: <span className="text-white">{signal.reason}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpiredSignals;
