import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import Logger from '@/utils/logger';
import { checkMarketHours } from '@/utils/marketHours';
import { createFallbackChartData } from '@/utils/chartDataUtils';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  isEntry?: boolean;
  isFrozen?: boolean;
}

interface RealTimeChartProps {
  priceData: PriceData[];
  signalType: string;
  currentPrice?: number;
  isConnected: boolean;
  entryPrice?: number;
  isLoading?: boolean;
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({
  priceData,
  signalType,
  currentPrice,
  isConnected,
  entryPrice,
  isLoading = false
}) => {
  const formatPrice = (price: number): string => {
    return price.toFixed(5);
  };

  const chartConfig = {
    price: {
      label: "Price",
      color: signalType === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  // Enhanced market status check
  const marketStatus = useMemo(() => {
    const status = checkMarketHours();
    Logger.debug('chart', `Market status: open=${status.isOpen}`);
    return status;
  }, []);

  // Process and validate chart data with proper fallback handling  
  const chartData = useMemo(() => {
    Logger.debug('chart', 'Processing chart data:', { 
      priceDataLength: priceData?.length, 
      hasCurrentPrice: !!currentPrice,
      hasEntryPrice: !!entryPrice,
      isLoading,
      marketOpen: marketStatus.isOpen
    });

    // Use provided chart data if available and valid
    if (Array.isArray(priceData) && priceData.length > 0) {
      const validatedData = priceData
        .filter(point => point && typeof point.price === 'number' && !isNaN(point.price))
        .map(point => ({
          ...point,
          isFrozen: !marketStatus.isOpen
        }));
      
      if (validatedData.length > 0) {
        Logger.debug('chart', `Using provided chart data: ${validatedData.length} points`);
        return validatedData;
      }
    }

    // Create fallback data when no historical data available
    const fallbackData = createFallbackChartData(currentPrice, entryPrice, marketStatus.isOpen);
    Logger.debug('chart', `Using fallback data: ${fallbackData.length} points`);
    return fallbackData;
  }, [priceData, currentPrice, entryPrice, isLoading, marketStatus.isOpen]);

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
  const isFrozenChart = chartData.length > 0 && chartData.some(d => d.isFrozen);

  return (
    <div className="relative">
      {/* Enhanced Live Status Indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center space-x-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            !marketStatus.isOpen ? 'bg-gray-400' :
            isConnected && hasValidData ? 'bg-green-400 animate-pulse' :
            isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
          }`} />
          <span className="text-muted-foreground font-mono">
            {!marketStatus.isOpen ? 'MARKET CLOSED' :
             isFrozenChart ? 'FROZEN' :
             isConnected && hasValidData ? 'LIVE' :
             isLoading ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Market Closed Overlay */}
      {!marketStatus.isOpen && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg">
          <div className="text-center">
            <div className="text-sm font-semibold text-muted-foreground mb-1">
              Market Closed
            </div>
            <div className="text-xs text-muted-foreground">
              Next session: Monday 00:00 GMT
            </div>
          </div>
        </div>
      )}

      {/* Current Price Display */}
      {currentPrice && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-background/90 backdrop-blur-sm rounded px-2 py-1 border border-border">
            <div className="text-xs text-muted-foreground">Current</div>
            <div className="text-sm font-mono font-bold text-primary">
              {formatPrice(currentPrice)}
            </div>
          </div>
        </div>
      )}

      {/* Entry Price Display */}
      {entryPrice && (
        <div className="absolute bottom-2 left-2 z-10">
          <div className="bg-background/90 backdrop-blur-sm rounded px-2 py-1 border border-border">
            <div className="text-xs text-muted-foreground">Entry</div>
            <div className="text-sm font-mono text-muted-foreground">
              {formatPrice(entryPrice)}
            </div>
          </div>
        </div>
      )}

      {/* Loading Message */}
      {isLoading && hasValidData === false && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-xs text-muted-foreground animate-pulse">
            Preparing live data...
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="h-48 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={marketStatus.isOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}
            />
            <XAxis 
              dataKey="time" 
              stroke={marketStatus.isOpen ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)"}
              fontSize={10}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke={marketStatus.isOpen ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)"}
              fontSize={10}
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={formatPrice}
              width={60}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-2 shadow-lg">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-sm font-mono text-primary">
                        {formatPrice(payload[0].value as number)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {/* Main price line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke={chartConfig.price.color}
              strokeWidth={marketStatus.isOpen ? 2 : 1.5}
              strokeDasharray={marketStatus.isOpen ? "0" : "5 5"}
              dot={{ r: 2, fill: chartConfig.price.color }}
              activeDot={{ r: 4, fill: chartConfig.price.color, strokeWidth: 0 }}
              connectNulls={false}
              animationDuration={marketStatus.isOpen ? 300 : 0}
            />
            
            {/* Entry price reference line */}
            {entryPrice && (
              <Line
                type="monotone"
                dataKey={() => entryPrice}
                stroke="rgba(156, 163, 175, 0.6)"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                connectNulls={true}
                animationDuration={0}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RealTimeChart;