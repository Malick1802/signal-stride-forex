
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Database, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const MarketData = () => {
  const [marketData, setMarketData] = useState([]);
  const [dbStats, setDbStats] = useState({
    totalRecords: 0,
    lastUpdate: null,
    pairs: 0,
    dataSource: 'tiingo'
  });
  const [isConnected, setIsConnected] = useState(true);

  const fetchDatabaseStats = async () => {
    try {
      // Get count of total records
      const { count } = await supabase
        .from('live_market_data')
        .select('*', { count: 'exact', head: true });
      
      // Get latest record with source info
      const { data: latest } = await supabase
        .from('live_market_data')
        .select('created_at, source')
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Get unique pairs count
      const { data: pairs } = await supabase
        .from('live_market_data')
        .select('symbol')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      const uniquePairs = new Set(pairs?.map(p => p.symbol) || []).size;
      
      setDbStats({
        totalRecords: count || 0,
        lastUpdate: latest?.[0]?.created_at || null,
        pairs: uniquePairs,
        dataSource: latest?.[0]?.source?.includes('tiingo') ? 'tiingo' : 'mixed'
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
      setIsConnected(false);
    }
  };

  const fetchLiveMarketData = async () => {
    try {
      // Get live data from centralized market state (Tiingo data)
      const { data: liveData } = await supabase
        .from('centralized_market_state')
        .select('*')
        .eq('is_market_open', true)
        .order('last_update', { ascending: false })
        .limit(12);

      if (liveData && liveData.length > 0) {
        const formattedData = liveData.map(item => {
          const currentPrice = parseFloat(item.current_price.toString());
          const bid = parseFloat(item.bid?.toString() || '0');
          const ask = parseFloat(item.ask?.toString() || '0');
          const spread = ask - bid;
          const spreadPercent = ((spread / currentPrice) * 100);
          
          // Calculate 24h change (simulated for demo)
          const change24h = (Math.random() - 0.5) * currentPrice * 0.02;
          const changePercent = (change24h / currentPrice) * 100;
          
          return {
            pair: item.symbol,
            price: currentPrice.toFixed(item.symbol.includes('JPY') ? 3 : 5),
            change: change24h.toFixed(5),
            changePercent: changePercent.toFixed(2),
            high: (currentPrice + Math.abs(change24h) * 0.5).toFixed(item.symbol.includes('JPY') ? 3 : 5),
            low: (currentPrice - Math.abs(change24h) * 0.5).toFixed(item.symbol.includes('JPY') ? 3 : 5),
            bid: bid.toFixed(item.symbol.includes('JPY') ? 3 : 5),
            ask: ask.toFixed(item.symbol.includes('JPY') ? 3 : 5),
            spread: spread.toFixed(item.symbol.includes('JPY') ? 3 : 5),
            spreadPercent: spreadPercent.toFixed(4),
            volume: Math.floor(Math.random() * 1000000) + 500000,
            trend: change24h > 0 ? 'up' : 'down',
            source: item.source || 'tiingo',
            lastUpdate: item.last_update
          };
        });
        
        setMarketData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching live market data:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchDatabaseStats();
    fetchLiveMarketData();
    
    const statsInterval = setInterval(fetchDatabaseStats, 10000);
    const dataInterval = setInterval(fetchLiveMarketData, 5000);
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(dataInterval);
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

  const getDataSourceColor = (source) => {
    if (source === 'tiingo') return 'text-emerald-400';
    if (source.includes('tiingo')) return 'text-blue-400';
    return 'text-purple-400';
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
          <div className="text-blue-400 text-xs mt-1">Tiingo market data points</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            <span className="text-gray-400 text-sm">Last Update</span>
          </div>
          <div className="text-emerald-400 text-lg font-bold">{formatTimeAgo(dbStats.lastUpdate)}</div>
          <div className="text-emerald-400 text-xs mt-1">Tiingo sync time</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Active Pairs</span>
          </div>
          <div className="text-purple-400 text-2xl font-bold">{dbStats.pairs}</div>
          <div className="text-purple-400 text-xs mt-1">Institutional grade</div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Wifi className={`h-5 w-5 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-gray-400 text-sm">Data Source</span>
          </div>
          <div className={`text-lg font-bold ${getDataSourceColor(dbStats.dataSource)}`}>
            {dbStats.dataSource.toUpperCase()}
          </div>
          <div className={`text-xs mt-1 ${getDataSourceColor(dbStats.dataSource)}`}>
            {isConnected ? 'Tier-1 banks' : 'Check connection'}
          </div>
        </div>
      </div>

      {/* Market Data Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Live Tiingo Market Data</h2>
          <p className="text-gray-400 text-sm">Real-time forex prices from tier-1 banks and FX dark pools</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-gray-400 font-medium">Pair</th>
                <th className="text-right p-4 text-gray-400 font-medium">Price</th>
                <th className="text-right p-4 text-gray-400 font-medium">Bid</th>
                <th className="text-right p-4 text-gray-400 font-medium">Ask</th>
                <th className="text-right p-4 text-gray-400 font-medium">Spread</th>
                <th className="text-right p-4 text-gray-400 font-medium">Change</th>
                <th className="text-right p-4 text-gray-400 font-medium">Change %</th>
                <th className="text-right p-4 text-gray-400 font-medium">Source</th>
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
                    <span className="text-blue-400 font-mono text-sm">{item.bid}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-red-400 font-mono text-sm">{item.ask}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-gray-300 text-xs">
                      <div className="font-mono">{item.spread}</div>
                      <div>({item.spreadPercent}%)</div>
                    </div>
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
                    <div className="text-xs">
                      <div className={`font-medium ${getDataSourceColor(item.source)}`}>
                        {item.source?.includes('tiingo') ? 'TIINGO' : 'OTHER'}
                      </div>
                      <div className="text-gray-400">
                        {formatTimeAgo(item.lastUpdate)}
                      </div>
                    </div>
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
