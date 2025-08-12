
import React, { useState, useEffect, useMemo } from 'react';
import { ChartContainer } from '@/components/ui/chart';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';
import CandlestickChart from '@/components/charts/Candlestick';
import { bucketTicksToOHLC, getPriceExtent } from '@/utils/ohlc';

interface TradingChartProps {
  selectedPair: string;
  onPairChange: (pair: string) => void;
  availablePairs: string[];
}

const TradingChart = ({ selectedPair, onPairChange, availablePairs }: TradingChartProps) => {
  const {
    priceData,
    currentPrice,
    isMarketOpen,
    lastUpdateTime,
    dataSource,
    isConnected,
    getPriceChange
  } = useRealTimeMarketData({
    pair: selectedPair,
    entryPrice: '1.0000' // Default for main chart
  });

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const { change, percentage } = getPriceChange();

  const candles = useMemo(() => bucketTicksToOHLC(priceData), [priceData]);
  const { min, max } = useMemo(() => getPriceExtent(candles), [candles]);
  const pad = (max - min) * 0.1 || 0.0005;
  const yDomain: [number, number] = [min - pad, max + pad];

  const chartConfig = {
    price: {
      label: "Price",
      color: change >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))",
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
              <span className={`text-sm font-mono ${
                change >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {change >= 0 ? '+' : ''}{change.toFixed(5)} ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
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
          <CandlestickChart
            data={candles}
            yDomain={yDomain}
            positiveColor="hsl(var(--chart-2))"
            negativeColor="hsl(var(--destructive))"
          />
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
          <span className="text-white font-mono">{priceData.length}</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Update Rate</span>
          <span className="text-white font-mono">1s</span>
        </div>
        <div className="text-gray-400">
          <span className="block">Last Update</span>
          <span className="text-white font-mono">{lastUpdateTime}</span>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
