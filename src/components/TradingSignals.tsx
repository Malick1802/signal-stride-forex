
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Target, Shield } from 'lucide-react';

const TradingSignals = () => {
  const [signals, setSignals] = useState([]);

  // Mock signal data generation
  useEffect(() => {
    const generateSignals = () => {
      const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];
      const mockSignals = pairs.map((pair, index) => ({
        id: index + 1,
        pair,
        type: Math.random() > 0.5 ? 'BUY' : 'SELL',
        entryPrice: (Math.random() * 2 + 0.5).toFixed(5),
        stopLoss: (Math.random() * 2 + 0.5).toFixed(5),
        takeProfit1: (Math.random() * 2 + 0.5).toFixed(5),
        takeProfit2: (Math.random() * 2 + 0.5).toFixed(5),
        takeProfit3: (Math.random() * 2 + 0.5).toFixed(5),
        confidence: Math.floor(Math.random() * 20 + 80),
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        status: Math.random() > 0.3 ? 'active' : 'hit_tp'
      }));
      setSignals(mockSignals);
    };

    generateSignals();
    const interval = setInterval(generateSignals, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">12</div>
          <div className="text-gray-400 text-sm">Active Signals</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-blue-400 text-2xl font-bold">87%</div>
          <div className="text-gray-400 text-sm">Win Rate</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-purple-400 text-2xl font-bold">+$2,450</div>
          <div className="text-gray-400 text-sm">Today's P&L</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-orange-400 text-2xl font-bold">156</div>
          <div className="text-gray-400 text-sm">Signals Today</div>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {signals.map(signal => (
          <div key={signal.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{signal.pair}</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">FOREX</span>
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    signal.type === 'BUY' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {signal.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {signal.type === 'BUY' ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-400 text-sm">
                    {signal.type === 'BUY' ? 'BUY Signal' : 'SELL Signal'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">{signal.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Signal Details */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Entry Price</span>
                <span className="text-white font-mono">${signal.entryPrice}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Stop Loss</span>
                <span className="text-red-400 font-mono">${signal.stopLoss}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Target 1</span>
                  <span className="text-emerald-400 font-mono">${signal.takeProfit1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Target 2</span>
                  <span className="text-emerald-400 font-mono">${signal.takeProfit2}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Target 3</span>
                  <span className="text-emerald-400 font-mono">${signal.takeProfit3}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1 text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(signal.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    signal.status === 'active' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {signal.status === 'active' ? 'Active' : 'TP Hit'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TradingSignals;
