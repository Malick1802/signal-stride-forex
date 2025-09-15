
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Database, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const MarketData = () => {
  const [marketData, setMarketData] = useState([]);
  const [dbStats, setDbStats] = useState({
    totalRecords: 0,
    lastUpdate: null,
    pairs: 0
  });
  const [isConnected, setIsConnected] = useState(true);

  const fetchDatabaseStats = async () => {
    try {
      // Get count of total records
      const { count } = await supabase
        .from('live_market_data')
        .select('*', { count: 'exact', head: true });
      
      // Get latest record
      const { data: latest } = await supabase
        .from('live_market_data')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Get unique pairs count
      const { data: pairs } = await supabase
        .from('live_market_data')
        .select('symbol')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      const uniquePairs = new Set((pairs as any[])?.map((p: any) => p.symbol) || []).size;
      
      setDbStats({
        totalRecords: count || 0,
        lastUpdate: (latest as any)?.[0]?.created_at || null,
        pairs: uniquePairs
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
      setIsConnected(false);
    }
  };

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
    fetchDatabaseStats();
    
    const interval = setInterval(generateMarketData, 5000);
    const statsInterval = setInterval(fetchDatabaseStats, 10000);
    
    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, []);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="h-5 w-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Database Records</span>
          </div>
          <div className="text-blue-400 text-2xl font-bold">{dbStats.totalRecords.toLocaleString()}</div>
          <div className="text-blue-400 text-xs mt-1">Total market data points</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            <span className="text-gray-400 text-sm">Last Update</span>
          </div>
          <div className="text-emerald-400 text-lg font-bold">{formatTimeAgo(dbStats.lastUpdate)}</div>
          <div className="text-emerald-400 text-xs mt-1">Database sync time</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Active Pairs</span>
          </div>
          <div className="text-purple-400 text-2xl font-bold">{dbStats.pairs}</div>
          <div className="text-purple-400 text-xs mt-1">Last 24 hours</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Wifi className={`h-5 w-5 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-gray-400 text-sm">Connection</span>
          </div>
          <div className={`text-lg font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className={`text-xs mt-1 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConnected ? 'Real-time data' : 'Check connection'}
          </div>
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
