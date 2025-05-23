
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MarketData = () => {
  const [marketData, setMarketData] = useState([]);

  useEffect(() => {
    const generateMarketData = () => {
      const pairs = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD',
        'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'CHFJPY', 'CADCHF'
      ];
      
      const data = pairs.map(pair => {
        const basePrice = Math.random() * 2 + 0.5;
        const change = (Math.random() - 0.5) * 0.02;
        const changePercent = (change / basePrice) * 100;
        
        return {
          pair,
          price: basePrice.toFixed(5),
          change: change.toFixed(5),
          changePercent: changePercent.toFixed(2),
          high: (basePrice + Math.random() * 0.01).toFixed(5),
          low: (basePrice - Math.random() * 0.01).toFixed(5),
          volume: Math.floor(Math.random() * 1000000) + 500000,
          trend: change > 0 ? 'up' : 'down'
        };
      });
      
      setMarketData(data);
    };

    generateMarketData();
    const interval = setInterval(generateMarketData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">42</div>
          <div className="text-gray-400 text-sm">Pairs Monitored</div>
          <div className="text-emerald-400 text-xs mt-1">+5 this week</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-blue-400 text-2xl font-bold">1.2M</div>
          <div className="text-gray-400 text-sm">Total Volume</div>
          <div className="text-blue-400 text-xs mt-1">Last 24h</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-purple-400 text-2xl font-bold">0.03s</div>
          <div className="text-gray-400 text-sm">Avg Latency</div>
          <div className="text-purple-400 text-xs mt-1">Real-time data</div>
        </div>
      </div>

      {/* Market Data Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Live Market Data</h2>
          <p className="text-gray-400 text-sm">Real-time forex pair prices and movements</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Pair</th>
                <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                <th className="text-right p-4 text-gray-400 font-medium">Change</th>
                <th className="text-right p-4 text-gray-400 font-medium">Change %</th>
                <th className="text-right p-4 text-gray-400 font-medium">High</th>
                <th className="text-right p-4 text-gray-400 font-medium">Low</th>
                <th className="text-right p-4 text-gray-400 font-medium">Volume</th>
              </tr>
            </thead>
            <tbody>
              {marketData.map((item, index) => (
                <tr 
                  key={item.pair} 
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                    index % 2 === 0 ? 'bg-white/2' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{item.pair}</span>
                      {item.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-white font-mono">{item.price}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-mono ${
                      parseFloat(item.change) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {parseFloat(item.change) >= 0 ? '+' : ''}{item.change}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`font-mono ${
                      parseFloat(item.changePercent) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {parseFloat(item.changePercent) >= 0 ? '+' : ''}{item.changePercent}%
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-300 font-mono">{item.high}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-300 font-mono">{item.low}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-300">{item.volume.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketData;
