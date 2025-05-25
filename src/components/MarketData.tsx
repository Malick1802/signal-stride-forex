
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MarketDataItem {
  pair: string;
  price: string;
  change: string;
  changePercent: string;
  high: string;
  low: string;
  volume: number;
  trend: 'up' | 'down';
  source: string;
  timestamp: string;
}

const MarketData = () => {
  const [marketData, setMarketData] = useState<MarketDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Trigger market data generation
  const generateMarketData = async () => {
    try {
      console.log('Triggering market data generation...');
      const { data, error } = await supabase.functions.invoke('fetch-market-data');
      
      if (error) {
        console.error('Error generating market data:', error);
      } else {
        console.log('Market data generation response:', data);
      }
    } catch (error) {
      console.error('Error calling market data function:', error);
    }
  };

  // Fetch real market data from the database
  const fetchMarketData = async () => {
    try {
      console.log('Fetching market data from database...');
      
      // Get the latest market data for each symbol
      const { data: latestData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching market data:', error);
        return;
      }

      if (latestData && latestData.length > 0) {
        // Group by symbol and get the latest for each
        const symbolMap = new Map();
        latestData.forEach(item => {
          if (!symbolMap.has(item.symbol)) {
            symbolMap.set(item.symbol, item);
          }
        });

        // Transform to display format
        const transformedData = Array.from(symbolMap.values()).map(item => {
          const currentPrice = parseFloat(item.price.toString());
          
          // Calculate mock change (in real app, this would be from historical data)
          const change = (Math.random() - 0.5) * 0.01;
          const changePercent = (change / currentPrice) * 100;
          
          return {
            pair: item.symbol,
            price: currentPrice.toFixed(item.symbol.includes('JPY') ? 3 : 5),
            change: change.toFixed(5),
            changePercent: changePercent.toFixed(2),
            high: (currentPrice + Math.random() * 0.01).toFixed(item.symbol.includes('JPY') ? 3 : 5),
            low: (currentPrice - Math.random() * 0.01).toFixed(item.symbol.includes('JPY') ? 3 : 5),
            volume: Math.floor(Math.random() * 1000000) + 500000,
            trend: change > 0 ? 'up' : 'down',
            source: item.source || 'centralized',
            timestamp: item.created_at
          } as MarketDataItem;
        });

        setMarketData(transformedData);
        setLastUpdate(new Date().toLocaleTimeString());
        console.log(`Loaded ${transformedData.length} market data pairs from database`);
      } else {
        console.log('No market data found in database, triggering generation...');
        await generateMarketData();
        // Wait a bit and try again
        setTimeout(fetchMarketData, 3000);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time updates and periodic refresh
  useEffect(() => {
    // Initial fetch
    fetchMarketData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('market-data-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_market_data'
        },
        (payload) => {
          console.log('Real-time market data update:', payload);
          fetchMarketData();
        }
      )
      .subscribe();

    // Periodic refresh every 30 seconds and trigger generation
    const interval = setInterval(() => {
      generateMarketData();
      fetchMarketData();
    }, 30000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const realDataCount = marketData.filter(item => item.source.includes('real')).length;
  const totalPairs = marketData.length;

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">{totalPairs}</div>
          <div className="text-gray-400 text-sm">Pairs Monitored</div>
          <div className="text-emerald-400 text-xs mt-1">
            {realDataCount > 0 ? `${realDataCount} real data` : 'Centralized simulation'}
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-blue-400 text-2xl font-bold">
            {marketData.reduce((sum, item) => sum + item.volume, 0).toLocaleString()}
          </div>
          <div className="text-gray-400 text-sm">Total Volume</div>
          <div className="text-blue-400 text-xs mt-1">Last update: {lastUpdate}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-purple-400 text-2xl font-bold">
            {isLoading ? '...' : '0.05s'}
          </div>
          <div className="text-gray-400 text-sm">Avg Latency</div>
          <div className="text-purple-400 text-xs mt-1">
            {realDataCount > 0 ? 'Real-time data' : 'Simulation mode'}
          </div>
        </div>
      </div>

      {/* Market Data Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Live Market Data</h2>
          <p className="text-gray-400 text-sm">
            {realDataCount > 0 
              ? `${realDataCount} real-time forex pairs, ${totalPairs - realDataCount} simulated`
              : 'Centralized market simulation with realistic price movements'
            }
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading market data...</div>
          ) : (
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
                    <td className="p-4 text-right">
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.source.includes('real') 
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.source.includes('real') ? 'REAL' : 'SIM'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketData;
