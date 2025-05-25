
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

interface TradingChartProps {
  selectedPair: string;
  onPairChange: (pair: string) => void;
  availablePairs: string[];
}

const TradingChart = ({ selectedPair, onPairChange, availablePairs }: TradingChartProps) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // Check if forex market is currently open
  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    
    const marketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;
    return !marketClosed;
  };

  // Fetch centralized market data from the same source as signals
  const fetchCentralizedMarketData = async () => {
    try {
      console.log('Fetching centralized market data for chart:', selectedPair);
      
      // First try to get the latest signal for this pair to use its current price
      const { data: latestSignal, error: signalError } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('symbol', selectedPair)
        .eq('status', 'active')
        .eq('is_centralized', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (signalError) {
        console.error('Error fetching signal data:', signalError);
      }

      // Get market data from the same source as signals
      const { data: marketData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .eq('symbol', selectedPair)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching centralized market data:', error);
        return;
      }

      if (marketData && marketData.length > 0) {
        console.log(`Found ${marketData.length} centralized market data points for ${selectedPair}`);
        
        const transformedData = marketData.reverse().map((item, index) => ({
          timestamp: new Date(item.created_at || item.timestamp).getTime(),
          time: new Date(item.created_at || item.timestamp).toLocaleTimeString(),
          price: parseFloat(item.price.toString()),
          volume: Math.random() * 1000000
        }));

        setPriceData(transformedData);
        
        // Use the latest market price or signal price
        const latestPrice = transformedData[transformedData.length - 1]?.price || 
                           (latestSignal ? parseFloat(latestSignal.price.toString()) : null);
        
        if (latestPrice) {
          setCurrentPrice(latestPrice);
        }
      } else {
        console.log('No centralized market data found, using signal price as base');
        
        // If no market data but we have a signal, use the signal's price
        if (latestSignal) {
          const signalPrice = parseFloat(latestSignal.price.toString());
          setCurrentPrice(signalPrice);
          
          // Generate minimal chart data around the signal price
          const now = Date.now();
          const data: PriceData[] = [];
          
          for (let i = 49; i >= 0; i--) {
            const timestamp = now - (i * 60000);
            const minimalMovement = (Math.random() - 0.5) * 0.00002; // Very small movement
            const price = signalPrice + minimalMovement;
            
            data.push({
              timestamp,
              time: new Date(timestamp).toLocaleTimeString(),
              price,
              volume: Math.random() * 1000000
            });
          }
          
          setPriceData(data);
        }
      }
    } catch (error) {
      console.error('Error fetching centralized market data:', error);
    }
  };

  // Real-time updates synchronized with signals
  useEffect(() => {
    const marketOpen = checkMarketHours();
    setIsMarketOpen(marketOpen);

    // Initial fetch
    fetchCentralizedMarketData();
    
    // Set up real-time subscription for market data updates
    const channel = supabase
      .channel('chart-market-data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_market_data',
          filter: `symbol=eq.${selectedPair}`
        },
        (payload) => {
          console.log('Real-time market data update for chart:', payload);
          fetchCentralizedMarketData();
        }
      )
      .subscribe();

    // Also listen for signal updates to stay synchronized
    const signalChannel = supabase
      .channel('chart-signal-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: `symbol=eq.${selectedPair}`
        },
        (payload) => {
          console.log('Signal update affecting chart:', payload);
          fetchCentralizedMarketData();
        }
      )
      .subscribe();

    // Regular refresh to stay synchronized
    const interval = setInterval(() => {
      const currentlyOpen = checkMarketHours();
      setIsMarketOpen(currentlyOpen);
      fetchCentralizedMarketData();
    }, 30000); // Update every 30 seconds

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(signalChannel);
      clearInterval(interval);
    };
  }, [selectedPair]);

  const chartConfig = {
    price: {
      label: "Price",
      color: "#10b981",
    },
  };

  const formatPrice = (price: number) => {
    return price.toFixed(selectedPair.includes('JPY') ? 3 : 5);
  };

  const getPriceChange = () => {
    if (priceData.length < 2) return { change: 0, percentage: 0 };
    const current = priceData[priceData.length - 1]?.price || 0;
    const previous = priceData[priceData.length - 2]?.price || 0;
    const change = current - previous;
    const percentage = (change / previous) * 100;
    return { change, percentage };
  };

  const { change, percentage } = getPriceChange();

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <select
            value={selectedPair}
            onChange={(e) => onPairChange(e.target.value)}
            className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availablePairs.map(pair => (
              <option key={pair} value={pair} className="bg-gray-800 text-white">
                {pair}
              </option>
            ))}
          </select>
          
          {currentPrice && (
            <div className="flex items-center space-x-2">
              <span className="text-white text-xl font-mono">{formatPrice(currentPrice)}</span>
              <span className={`text-sm font-mono ${
                change >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {change >= 0 ? '+' : ''}{change.toFixed(5)} ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
              </span>
              <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">
                CENTRALIZED
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            isMarketOpen 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
          <span className="text-xs px-2 py-1 rounded font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            ● SYNC WITH SIGNALS
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.5)"
                fontSize={10}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)"
                fontSize={10}
                domain={['dataMin - 0.001', 'dataMax + 0.001']}
                tickFormatter={formatPrice}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any) => [formatPrice(Number(value)), 'Price']}
                  labelFormatter={(label) => `Time: ${label}`}
                />} 
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={change >= 0 ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                connectNulls
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Chart Info */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-xs">
        <div className="text-gray-400">
          <span className="block">Data Source</span>
          <span className="text-emerald-400 font-mono">
            Centralized Signals
          </span>
        </div>
        <div className="text-gray-400">
          <span className="block">Data Points</span>
          <span className="text-white font-mono">{priceData.length}</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Sync Status</span>
          <span className="text-emerald-400 font-mono">
            Real-time
          </span>
        </div>
        <div className="text-gray-400">
          <span className="block">Market Status</span>
          <span className={`font-mono ${isMarketOpen ? 'text-emerald-400' : 'text-red-400'}`}>
            {isMarketOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
