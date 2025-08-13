
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { checkMarketHours } from '@/utils/marketHours';
import Logger from '@/utils/logger';

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

  // Get market status for chart behavior
  const marketStatus = useMemo(() => checkMarketHours(), []);

  // Enhanced chart data processing with market hours validation
  const chartData = useMemo(() => {
    Logger.debug('chart', `Processing data: ${priceData?.length || 0} points, currentPrice: ${currentPrice}, loading: ${isLoading}, marketOpen: ${marketStatus.isOpen}`);
    
    // If market is closed, freeze the chart with last known data
    if (!marketStatus.isOpen) {
      Logger.debug('chart', 'Market closed - displaying frozen data');
      
      if (Array.isArray(priceData) && priceData.length > 0) {
        // Return existing price data without modifications
        return priceData.map((point, index) => ({
          time: `${index}`,
          price: typeof point.price === 'number' ? point.price : Number(point.price),
          timestamp: point.timestamp,
          isEntry: entryPrice && Math.abs(point.price - entryPrice) < 0.00001,
          isFrozen: true
        }));
      }
      
      // If no data and market closed, show entry price as frozen point
      if (entryPrice && typeof entryPrice === 'number' && !isNaN(entryPrice)) {
        return [{
          time: "0",
          price: entryPrice,
          timestamp: Date.now(),
          isEntry: true,
          isFrozen: true
        }];
      }
      
      return [];
    }
    
    // Market is open - process live data normally
    if (Array.isArray(priceData) && priceData.length > 0) {
      const transformedData = priceData
        .filter(point => point && typeof point === 'object' && point.price && !isNaN(point.price))
        .map((point, index) => {
          const priceValue = typeof point.price === 'number' ? point.price : Number(point.price);
          
          return {
            time: `${index}`,
            price: priceValue,
            timestamp: point.timestamp,
            isEntry: entryPrice && Math.abs(priceValue - entryPrice) < 0.00001,
            isFrozen: false
          };
        });
      
      if (transformedData.length > 0) {
        Logger.debug('chart', `Live data ready: ${transformedData.length} points`);
        return transformedData;
      }
    }

    // Enhanced fallback with current price - only during market hours
    if (currentPrice && typeof currentPrice === 'number' && !isNaN(currentPrice) && marketStatus.isOpen) {
      const now = Date.now();
      const basePrice = entryPrice || currentPrice;
      const variation = basePrice * 0.0001;
      
      const fallbackData = [
        {
          time: "0",
          price: basePrice - variation,
          timestamp: now - 60000,
          isEntry: false,
          isFrozen: false
        },
        {
          time: "1", 
          price: basePrice,
          timestamp: now - 30000,
          isEntry: !!entryPrice,
          isFrozen: false
        },
        {
          time: "2",
          price: currentPrice,
          timestamp: now,
          isEntry: false,
          isFrozen: false
        }
      ];
      Logger.debug('chart', `Using enhanced fallback: ${currentPrice} with ${fallbackData.length} points`);
      return fallbackData;
    }

    // Entry price fallback - mark as frozen if market closed
    if (entryPrice && typeof entryPrice === 'number' && !isNaN(entryPrice)) {
      const now = Date.now();
      const variation = marketStatus.isOpen ? entryPrice * 0.0001 : 0;
      
      const entryFallback = [
        {
          time: "0",
          price: entryPrice - variation,
          timestamp: now - 30000,
          isEntry: false,
          isFrozen: !marketStatus.isOpen
        },
        {
          time: "1",
          price: entryPrice,
          timestamp: now,
          isEntry: true,
          isFrozen: !marketStatus.isOpen
        }
      ];
      Logger.debug('chart', `Using entry price fallback: ${entryPrice}, frozen: ${!marketStatus.isOpen}`);
      return entryFallback;
    }

    Logger.debug('chart', 'No data available for chart');
    return [];
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
  const isFrozenChart = chartData.length > 0 && chartData[0].isFrozen;

  return (
    <div className="relative">
      {/* Enhanced Live Status Indicator with Market Hours */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center space-x-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            !marketStatus.isOpen ? 'bg-gray-400' :
            isLoading ? 'bg-yellow-400 animate-pulse' :
            isConnected && hasValidData ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
          }`}></div>
          <span className={
            !marketStatus.isOpen ? 'text-gray-400' :
            isLoading ? 'text-yellow-400' :
            isConnected && hasValidData ? 'text-emerald-400' : 'text-red-400'
          }>
            {!marketStatus.isOpen ? 'MARKET CLOSED' :
             isLoading ? 'LOADING...' : 
             isConnected && hasValidData ? 'LIVE' : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* Market Closed Overlay */}
      {!marketStatus.isOpen && (
        <div className="absolute top-8 right-2 z-10">
          <div className="bg-red-500/20 backdrop-blur-sm rounded px-2 py-1 border border-red-500/30">
            <div className="text-red-400 text-xs font-medium">FROZEN</div>
            <div className="text-red-400 text-xs">Next Open:</div>
            <div className="text-red-400 text-xs">{marketStatus.nextOpenTime?.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Enhanced Current Price Display */}
      {currentPrice && !isLoading && (
        <div className="absolute top-2 left-2 z-10">
          <div className={`backdrop-blur-sm rounded px-2 py-1 ${
            marketStatus.isOpen ? 'bg-black/50' : 'bg-gray-600/50'
          }`}>
            <span className={`text-sm font-mono ${
              marketStatus.isOpen ? 'text-white' : 'text-gray-300'
            }`}>{formatPrice(currentPrice)}</span>
            <div className={`text-xs ${
              marketStatus.isOpen ? 'text-emerald-400' : 'text-gray-400'
            }`}>
              {marketStatus.isOpen ? 'LIVE' : 'FROZEN'}
            </div>
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

      {/* Market Status Message */}
      {!marketStatus.isOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-gray-600/50 backdrop-blur-sm rounded px-4 py-3 text-center">
            <div className="text-gray-300 text-sm font-medium mb-1">Market Closed</div>
            <div className="text-gray-400 text-xs">Chart data is frozen</div>
            <div className="text-gray-400 text-xs mt-1">
              Next open: {marketStatus.nextOpenTime?.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Improved Data Status for Market Hours */}
      {!hasValidData && marketStatus.isOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-2">
            <span className="text-white text-sm">
              {isLoading ? 'Loading live data...' : 
               isConnected ? 'Preparing live feed...' : 'Connecting to live feed...'}
            </span>
          </div>
        </div>
      )}

      <div className="w-full h-48 p-4">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={marketStatus.isOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"} 
              />
              <XAxis 
                dataKey="time" 
                stroke={marketStatus.isOpen ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)"}
                fontSize={8}
                interval="preserveStartEnd"
                tick={{ fontSize: 8 }}
              />
              <YAxis 
                stroke={marketStatus.isOpen ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)"}
                fontSize={8}
                domain={hasValidData ? [priceRange.min, priceRange.max] : ['auto', 'auto']}
                tickFormatter={formatPrice}
                tick={{ fontSize: 8 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value: any) => [
                    formatPrice(Number(value)), 
                    marketStatus.isOpen ? 'Live Price' : 'Frozen Price'
                  ]}
                  labelFormatter={(label) => `Point: ${label}${isFrozenChart ? ' (Frozen)' : ''}`}
                />} 
              />
              {hasValidData && (
                <>
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={marketStatus.isOpen ? 
                      (signalType === 'BUY' ? "#10b981" : "#ef4444") : 
                      "#6b7280"
                    }
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={marketStatus.isOpen}
                    animationDuration={marketStatus.isOpen ? 200 : 0}
                    strokeDasharray={!marketStatus.isOpen ? "5 5" : undefined}
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
