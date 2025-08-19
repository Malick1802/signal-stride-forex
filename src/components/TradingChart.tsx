
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';

interface TradingChartProps {
  selectedPair: string;
  onPairChange: (pair: string) => void;
  availablePairs: string[];
}

const TradingChart = ({ selectedPair, onPairChange, availablePairs }: TradingChartProps) => {
  const {
    currentPrice,
    isMarketOpen,
    dataSource,
    isConnected
  } = useRealTimeMarketData({
    pair: selectedPair
  });

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const chartConfig = {
    price: {
      label: "Price",
      color: "#10b981", // Default green color
    },
  };

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
              <span className="text-emerald-400 text-sm font-mono">
                Live Price
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
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            isConnected 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {isConnected ? '● LIVE' : '⚠ OFFLINE'}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 relative">
        {/* Real-time indicator */}
        <div className="absolute top-2 right-2 z-10">
          <div className={`flex items-center space-x-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span>REAL-TIME</span>
          </div>
        </div>

        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[]} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Chart Info */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-xs">
        <div className="text-gray-400">
          <span className="block">Data Source</span>
          <span className="text-white font-mono">{dataSource}</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Data Points</span>
          <span className="text-white font-mono">0</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Update Rate</span>
          <span className="text-white font-mono">15s</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Last Update</span>
          <span className="text-white font-mono">Live</span>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
