
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
}

interface RealTimeChartProps {
  priceData: PriceData[];
  signalType: string;
  currentPrice: number | null;
  isConnected: boolean;
  entryPrice?: number;
}

const RealTimeChart = ({ priceData, signalType, currentPrice, isConnected, entryPrice }: RealTimeChartProps) => {
  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const chartConfig = {
    price: {
      label: "Price",
      color: signalType === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  // Transform chart data safely - use only centralized live data
  const chartData = useMemo(() => {
    if (!Array.isArray(priceData) || priceData.length === 0) {
      console.log('📊 No chart data available - using fallback');
      // Create fallback data point if we have current price
      if (currentPrice) {
        const now = Date.now();
        return [
          {
            time: "0",
            price: currentPrice,
            timestamp: now,
            isEntry: false
          }
        ];
      }
      return [];
    }

    // Use only live centralized data - no stored signal data mixing
    return priceData.map((point, index) => ({
      time: `${index}`,
      price: point.price,
      timestamp: point.timestamp,
      // Mark entry point for reference only
      isEntry: entryPrice && Math.abs(point.price - entryPrice) < 0.00001
    }));
  }, [priceData, currentPrice, entryPrice]);

  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0 };
    
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05 || 0.0001; // Ensure minimum padding
    
    return {
      min: minPrice - padding,
      max: maxPrice + padding
    };
  }, [chartData]);

  return (
    <div className="relative">
      {/* Centralized Status Indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center space-x-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-400' : 'bg-red-400'
          }`}></div>
          <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Current Price Display */}
      {currentPrice && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-white text-sm font-mono">{formatPrice(currentPrice)}</span>
            <div className="text-xs text-emerald-400">LIVE</div>
          </div>
        </div>
      )}

      {/* Entry Price Reference Line */}
      {entryPrice && (
        <div className="absolute top-12 left-2 z-10">
          <div className="bg-blue-500/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-white text-xs font-mono">Entry: {formatPrice(entryPrice)}</span>
          </div>
        </div>
      )}

      {/* Chart Data Status */}
      {chartData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-2">
            <span className="text-white text-sm">Loading live data...</span>
          </div>
        </div>
      )}

      <div className="h-48 p-4">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.5)"
                fontSize={8}
                interval="preserveStartEnd"
                tick={{ fontSize: 8 }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)"
                fontSize={8}
                domain={chartData.length > 0 ? [priceRange.min, priceRange.max] : ['auto', 'auto']}
                tickFormatter={formatPrice}
                tick={{ fontSize: 8 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any) => [formatPrice(Number(value)), 'Live Price']}
                  labelFormatter={(label) => `Point: ${label}`}
                />} 
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={signalType === 'BUY' ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={true}
              />
              {/* Entry price reference line */}
              {entryPrice && chartData.length > 0 && (
                <Line
                  type="monotone"
                  dataKey={() => entryPrice}
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default RealTimeChart;
