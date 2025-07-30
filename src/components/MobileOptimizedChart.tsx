import React, { useRef, useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Capacitor } from '@capacitor/core';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
}

interface MobileOptimizedChartProps {
  data: PriceData[];
  pair: string;
  currentPrice?: number;
  entryPrice?: number;
  isLoading?: boolean;
  height?: number;
}

export const MobileOptimizedChart: React.FC<MobileOptimizedChartProps> = ({
  data,
  pair,
  currentPrice,
  entryPrice,
  isLoading = false,
  height = 200
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const isNative = Capacitor.isNativePlatform();

  // Optimize data for mobile performance - limit to last 50 points
  const optimizedData = useMemo(() => {
    if (!data.length) return [];
    
    const maxPoints = isNative ? 30 : 50; // Fewer points on native for better performance
    const recent = data.slice(-maxPoints);
    
    // Add current price point if available
    if (currentPrice && recent.length > 0) {
      const lastTime = recent[recent.length - 1]?.timestamp || Date.now();
      const currentTime = Date.now();
      
      if (currentTime - lastTime > 5000) { // Only add if more than 5 seconds old
        recent.push({
          timestamp: currentTime,
          time: new Date(currentTime).toLocaleTimeString('en-US', {
            hour12: false,
            minute: '2-digit',
            second: '2-digit'
          }),
          price: currentPrice
        });
      }
    }
    
    return recent;
  }, [data, currentPrice, isNative]);

  // Calculate price range for better visualization
  const priceRange = useMemo(() => {
    if (optimizedData.length === 0) return { min: 0, max: 1 };
    
    const prices = optimizedData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1; // 10% padding
    
    return {
      min: Math.max(0, min - padding),
      max: max + padding
    };
  }, [optimizedData]);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  const formatPrice = (price: number): string => {
    return price.toFixed(5);
  };

  const formatTime = (time: string): string => {
    // Show only time for mobile
    return time.split(' ')[1] || time;
  };

  // Custom tooltip for mobile
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{pair}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-sm font-mono text-primary">
            {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div 
        ref={chartRef}
        className="flex items-center justify-center bg-muted/30 rounded-lg"
        style={{ height }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (optimizedData.length === 0) {
    return (
      <div 
        ref={chartRef}
        className="flex items-center justify-center bg-muted/30 rounded-lg text-muted-foreground"
        style={{ height }}
      >
        <p className="text-sm">No chart data available</p>
      </div>
    );
  }

  return (
    <div ref={chartRef} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={optimizedData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <XAxis 
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatTime}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={[priceRange.min, priceRange.max]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatPrice}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Main price line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={isNative ? 1.5 : 2}
            dot={false}
            activeDot={{ 
              r: 3, 
              fill: 'hsl(var(--primary))',
              strokeWidth: 0
            }}
            connectNulls={false}
          />
          
          {/* Entry price reference line */}
          {entryPrice && (
            <Line
              type="monotone"
              dataKey={() => entryPrice}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              connectNulls={true}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Price indicators */}
      <div className="flex justify-between items-center mt-2 px-2">
        <div className="text-xs text-muted-foreground">
          {pair}
        </div>
        {currentPrice && (
          <div className="text-xs font-mono text-primary">
            {formatPrice(currentPrice)}
          </div>
        )}
      </div>
    </div>
  );
};