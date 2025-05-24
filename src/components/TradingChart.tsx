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

  // Generate realistic price movements
  const generatePriceMovement = (basePrice: number, previousData: PriceData[]) => {
    const lastPrice = previousData.length > 0 ? previousData[previousData.length - 1].price : basePrice;
    const volatility = 0.0002; // 0.02% volatility
    const trend = Math.sin(Date.now() / 100000) * 0.0001; // Subtle trending
    const randomMove = (Math.random() - 0.5) * volatility;
    return lastPrice + trend + randomMove;
  };

  // Fetch initial market data
  const fetchMarketData = async () => {
    try {
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', selectedPair)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching market data:', error);
        return;
      }

      if (data && data.length > 0) {
        const transformedData = data.map((item, index) => ({
          timestamp: new Date(item.timestamp).getTime(),
          time: new Date(item.timestamp).toLocaleTimeString(),
          price: parseFloat(item.price.toString()),
          volume: item.volume || Math.random() * 1000000
        })).reverse();

        setPriceData(transformedData);
        setCurrentPrice(transformedData[transformedData.length - 1]?.price || null);
      } else {
        // Generate initial data if no market data exists
        generateInitialData();
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
      generateInitialData();
    }
  };

  const generateInitialData = () => {
    const basePrice = getPairBasePrice(selectedPair);
    const now = Date.now();
    const data: PriceData[] = [];

    for (let i = 99; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1 minute intervals
      const price = generatePriceMovement(basePrice, data);
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
    const basePrices: Record<string, number> = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 148.50,
      'AUD/USD': 0.6720,
      'USD/CAD': 1.3580,
      'EUR/GBP': 0.8590,
      'EUR/JPY': 161.20,
      'GBP/JPY': 187.80,
      'AUD/JPY': 99.85,
      'USD/CHF': 0.8920
    };
    return basePrices[pair] || 1.0000;
  };

  // Real-time data updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setPriceData(prevData => {
        const now = Date.now();
        const newPrice = generatePriceMovement(getPairBasePrice(selectedPair), prevData);
        
        const newDataPoint: PriceData = {
          timestamp: now,
          time: new Date(now).toLocaleTimeString(),
          price: newPrice,
          volume: Math.random() * 1000000
        };

        setCurrentPrice(newPrice);

        // Keep last 100 data points
        const updatedData = [...prevData, newDataPoint].slice(-100);
        return updatedData;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [selectedPair, isLive]);

  // Fetch data when pair changes
  useEffect(() => {
    fetchMarketData();
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
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
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
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
        <div className="text-gray-400">
          <span className="block">Volume</span>
          <span className="text-white font-mono">
            {priceData.length > 0 ? (priceData[priceData.length - 1]?.volume?.toLocaleString() || 'N/A') : 'N/A'}
          </span>
        </div>
        <div className="text-gray-400">
          <span className="block">Data Points</span>
          <span className="text-white font-mono">{priceData.length}</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Update Rate</span>
          <span className="text-white font-mono">2s</span>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
