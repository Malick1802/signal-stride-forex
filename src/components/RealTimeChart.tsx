
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
  isLoading?: boolean;
}

const RealTimeChart = ({ priceData, signalType, currentPrice, isConnected, entryPrice, isLoading = false }: RealTimeChartProps) => {
  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const chartConfig = {
    price: {
      label: "Price",
      color: signalType === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  // Enhanced chart data processing with immediate updates
  const chartData = useMemo(() => {
    console.log(`📊 [Chart] Processing data: ${priceData?.length || 0} points, currentPrice: ${currentPrice}, loading: ${isLoading}`);
    
    // Prioritize live price data for real-time updates
    if (Array.isArray(priceData) && priceData.length > 0) {
      const transformedData = priceData.map((point, index) => {
        const priceValue = typeof point.price === 'number' ? point.price : Number(point.price);
        
        return {
          time: `${index}`,
          price: isNaN(priceValue) ? 0 : priceValue,
          timestamp: point.timestamp,
          isEntry: entryPrice && Math.abs(priceValue - entryPrice) < 0.00001
        };
      });
      
      console.log(`✅ [Chart] Live data ready: ${transformedData.length} points`);
      return transformedData;
    }

    // Enhanced fallback with current price
    if (currentPrice && typeof currentPrice === 'number' && !isLoading) {
      const now = Date.now();
      const fallbackData = [
        {
          time: "0",
          price: currentPrice,
          timestamp: now - 30000,
          isEntry: false
        },
        {
          time: "1",
          price: currentPrice,
          timestamp: now,
          isEntry: false
        }
      ];
      console.log(`📊 [Chart] Using live fallback: ${currentPrice}`);
      return fallbackData;
    }

    console.log(`📊 [Chart] No data available, loading: ${isLoading}`);
    return [];
  }, [priceData, currentPrice, entryPrice, isLoading]);

  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0 };
    
    const prices = chartData.map(d => d.price).filter(p => typeof p === 'number' && !isNaN(p));
    if (prices.length === 0) return { min: 0, max: 0 };
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05 || 0.0001;
    
    return {
      min: minPrice - padding,
      max: maxPrice + padding
    };
  }, [chartData]);

  const hasValidData = chartData.length > 0 && chartData.some(d => typeof d.price === 'number' && !isNaN(d.price));

  return (
    <div className="relative">
      {/* Enhanced Live Status Indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center space-x-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            isLoading ? 'bg-yellow-400 animate-pulse' :
            isConnected && hasValidData ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
          }`}></div>
          <span className={
            isLoading ? 'text-yellow-400' :
            isConnected && hasValidData ? 'text-emerald-400' : 'text-red-400'
          }>
            {isLoading ? 'LOADING...' : 
             isConnected && hasValidData ? 'LIVE' : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* Enhanced Current Price Display */}
      {currentPrice && !isLoading && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-white text-sm font-mono">{formatPrice(currentPrice)}</span>
            <div className="text-xs text-emerald-400">LIVE</div>
          </div>
        </div>
      )}

      {/* Entry Price Reference */}
      {entryPrice && (
        <div className="absolute top-12 left-2 z-10">
          <div className="bg-blue-500/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-white text-xs font-mono">Entry: {formatPrice(entryPrice)}</span>
          </div>
        </div>
      )}

      {/* Enhanced Data Status */}
      {!hasValidData && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-2">
            <span className="text-white text-sm">
              {isLoading ? 'Loading live data...' : 
               isConnected ? 'Waiting for live feed...' : 'Connecting to live feed...'}
            </span>
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
                domain={hasValidData ? [priceRange.min, priceRange.max] : ['auto', 'auto']}
                tickFormatter={formatPrice}
                tick={{ fontSize: 8 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any) => [formatPrice(Number(value)), 'Live Price']}
                  labelFormatter={(label) => `Point: ${label}`}
                />} 
              />
              {hasValidData && (
                <>
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={signalType === 'BUY' ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={true}
                    animationDuration={200}
                  />
                  {/* Entry price reference line */}
                  {entryPrice && (
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
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default RealTimeChart;
