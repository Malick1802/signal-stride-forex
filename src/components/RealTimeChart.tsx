
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface PriceData {
  time: number;
  price: number;
}

interface RealTimeChartProps {
  priceData: PriceData[];
  signalType: string;
  currentPrice: number | null;
  isConnected: boolean;
}

const RealTimeChart = ({ priceData, signalType, currentPrice, isConnected }: RealTimeChartProps) => {
  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const chartConfig = {
    price: {
      label: "Price",
      color: signalType === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  // Transform the stored chart data for display
  const chartData = useMemo(() => {
    if (!priceData || priceData.length === 0) {
      return [];
    }

    return priceData.map((point, index) => ({
      time: `${index}`,
      price: point.price,
      timestamp: point.time
    }));
  }, [priceData]);

  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0 };
    
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05; // 5% padding
    
    return {
      min: minPrice - padding,
      max: maxPrice + padding
    };
  }, [chartData]);

  const connectionStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
  const statusColor = isConnected ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="relative">
      {/* Connection Status Indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className={`flex items-center space-x-2 text-xs ${statusColor}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} ${isConnected ? 'animate-pulse' : ''}`}></div>
          <span>CENTRALIZED</span>
        </div>
      </div>

      {/* Current Price Display */}
      {currentPrice && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-white text-sm font-mono">{formatPrice(currentPrice)}</span>
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
                domain={[priceRange.min, priceRange.max]}
                tickFormatter={formatPrice}
                tick={{ fontSize: 8 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any) => [formatPrice(Number(value)), 'Price']}
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
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default RealTimeChart;
