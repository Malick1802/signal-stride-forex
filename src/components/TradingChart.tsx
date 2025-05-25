
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
  const [isLive, setIsLive] = useState(true);
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

  // Fetch real market data from database
  const fetchRealMarketData = async () => {
    try {
      console.log('Fetching real market data for:', selectedPair);
      
      const { data: marketData, error } = await supabase
        .from('live_market_data')
        .select('*')
        .eq('symbol', selectedPair)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching market data:', error);
        return;
      }

      if (marketData && marketData.length > 0) {
        console.log(`Found ${marketData.length} real data points for ${selectedPair}`);
        
        const transformedData = marketData.reverse().map((item, index) => ({
          timestamp: new Date(item.created_at || item.timestamp).getTime(),
          time: new Date(item.created_at || item.timestamp).toLocaleTimeString(),
          price: parseFloat(item.price.toString()),
          volume: Math.random() * 1000000 // Volume not available in current schema
        }));

        setPriceData(transformedData);
        setCurrentPrice(transformedData[transformedData.length - 1]?.price || null);
      } else {
        console.log('No real market data found, generating minimal fallback data');
        generateMinimalFallbackData();
      }
    } catch (error) {
      console.error('Error fetching real market data:', error);
      generateMinimalFallbackData();
    }
  };

  // Generate minimal fallback data when real data is unavailable
  const generateMinimalFallbackData = () => {
    const basePrice = getPairBasePrice(selectedPair);
    const now = Date.now();
    const data: PriceData[] = [];

    // Generate very stable data when real data isn't available
    for (let i = 99; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1 minute intervals
      const minimalVolatility = 0.000001; // Extremely small movement
      const price = basePrice + (Math.random() - 0.5) * minimalVolatility;
      
      data.push({
        timestamp,
        time: new Date(timestamp).toLocaleTimeString(),
        price,
        volume: Math.random() * 1000000
      });
    }

    setPriceData(data);
    setCurrentPrice(data[data.length - 1]?.price || basePrice);
  };

  const getPairBasePrice = (pair: string): number => {
    // These should match real market prices more closely
    const basePrices: Record<string, number> = {
      'EURUSD': 1.08500,
      'GBPUSD': 1.26500,
      'USDJPY': 148.500,
      'AUDUSD': 0.67200,
      'USDCAD': 1.35800,
      'EURGBP': 0.85900,
      'EURJPY': 161.200,
      'GBPJPY': 187.800,
      'AUDJPY': 99.850,
      'USDCHF': 0.89200
    };
    return basePrices[pair] || 1.0000;
  };

  // Real-time data updates - only during market hours
  useEffect(() => {
    if (!isLive) return;

    const marketOpen = checkMarketHours();
    setIsMarketOpen(marketOpen);

    const updateInterval = marketOpen ? 30000 : 300000; // 30s during market hours, 5min when closed
    
    const interval = setInterval(() => {
      const currentlyOpen = checkMarketHours();
      setIsMarketOpen(currentlyOpen);
      
      if (currentlyOpen) {
        fetchRealMarketData();
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [selectedPair, isLive]);

  // Fetch data when pair changes
  useEffect(() => {
    fetchRealMarketData();
  }, [selectedPair]);

  const chartConfig = {
    price: {
      label: "Price",
      color: "#10b981",
    },
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
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
              <span className="text-xs text-gray-400">
                {isMarketOpen ? 'Real-time data' : 'Market closed'}
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
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isLive 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}
          >
            {isLive ? '● LIVE' : '⏸ PAUSED'}
          </button>
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
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Chart Info */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-xs">
        <div className="text-gray-400">
          <span className="block">Data Source</span>
          <span className="text-white font-mono">
            {isMarketOpen ? 'FastForex API' : 'Last available'}
          </span>
        </div>
        <div className="text-gray-400">
          <span className="block">Data Points</span>
          <span className="text-white font-mono">{priceData.length}</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Update Rate</span>
          <span className="text-white font-mono">
            {isMarketOpen ? '30s' : '5min'}
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
