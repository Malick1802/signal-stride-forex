import React, { useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import CandlestickChart from '@/components/charts/Candlestick';
import { bucketTicksToOHLC, getPriceExtent } from '@/utils/ohlc';
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
  const formatPrice = (price: number) => price.toFixed(5);

  const chartConfig = {
    price: {
      label: 'Price',
      color: signalType === 'BUY' ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))',
    },
  } as const;

  const marketStatus = useMemo(() => checkMarketHours(), []);

  // Prepare point data with market-aware fallbacks
  const chartData = useMemo(() => {
    Logger.debug(
      'chart',
      `Processing data: ${priceData?.length || 0} points, currentPrice: ${currentPrice}, loading: ${isLoading}, marketOpen: ${marketStatus.isOpen}`
    );

    if (!marketStatus.isOpen) {
      if (Array.isArray(priceData) && priceData.length > 0) {
        return priceData.map((point, index) => ({
          time: point.time ?? `${index}`,
          price: Number(point.price),
          timestamp: point.timestamp ?? Date.now(),
          isFrozen: true,
        }));
      }
      if (typeof entryPrice === 'number' && !isNaN(entryPrice)) {
        return [
          { time: '0', price: entryPrice, timestamp: Date.now() - 30_000, isFrozen: true },
          { time: '1', price: entryPrice, timestamp: Date.now(), isFrozen: true },
        ];
      }
      return [];
    }

    if (Array.isArray(priceData) && priceData.length > 0) {
      const transformed = priceData
        .filter((p) => p && typeof p.price === 'number' && !isNaN(p.price))
        .map((p, i) => ({
          time: p.time ?? `${i}`,
          price: Number(p.price),
          timestamp: p.timestamp ?? Date.now(),
          isFrozen: false,
        }));
      if (transformed.length) return transformed;
    }

    if (typeof currentPrice === 'number' && !isNaN(currentPrice) && marketStatus.isOpen) {
      const now = Date.now();
      const basePrice = typeof entryPrice === 'number' ? entryPrice : currentPrice;
      const variation = basePrice * 0.0001;
      return [
        { time: '0', price: basePrice - variation, timestamp: now - 60_000, isFrozen: false },
        { time: '1', price: basePrice, timestamp: now - 30_000, isFrozen: false },
        { time: '2', price: currentPrice, timestamp: now, isFrozen: false },
      ];
    }

    if (typeof entryPrice === 'number' && !isNaN(entryPrice)) {
      const now = Date.now();
      const variation = marketStatus.isOpen ? entryPrice * 0.0001 : 0;
      return [
        { time: '0', price: entryPrice - variation, timestamp: now - 30_000, isFrozen: !marketStatus.isOpen },
        { time: '1', price: entryPrice, timestamp: now, isFrozen: !marketStatus.isOpen },
      ];
    }

    return [];
  }, [priceData, currentPrice, entryPrice, isLoading, marketStatus.isOpen]);

  // Convert to OHLC candles for candlestick chart
  const candles = useMemo(() => bucketTicksToOHLC(chartData as any, 60_000), [chartData]);
  const extent = useMemo(() => getPriceExtent(candles), [candles]);
  const yDomain: [number, number] | undefined = useMemo(() => {
    if (!candles.length) return undefined;
    const diff = extent.max - extent.min;
    const pad = diff > 0 ? diff * 0.05 : 0.0005;
    return [extent.min - pad, extent.max + pad];
  }, [candles, extent]);

  const hasValidData = candles.length > 0;

  return (
    <div className="relative">
      {/* Status indicator */}
      <div className="absolute top-2 right-2 z-10">
        <div className="flex items-center space-x-2 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              !marketStatus.isOpen
                ? 'bg-gray-400'
                : isLoading
                ? 'bg-yellow-400 animate-pulse'
                : isConnected && hasValidData
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-red-400'
            }`}
          />
          <span
            className={
              !marketStatus.isOpen
                ? 'text-gray-400'
                : isLoading
                ? 'text-yellow-400'
                : isConnected && hasValidData
                ? 'text-emerald-400'
                : 'text-red-400'
            }
          >
            {!marketStatus.isOpen
              ? 'MARKET CLOSED'
              : isLoading
              ? 'LOADING...'
              : isConnected && hasValidData
              ? 'LIVE'
              : 'CONNECTING...'}
          </span>
        </div>
      </div>

      {/* Market closed overlay */}
      {!marketStatus.isOpen && (
        <div className="absolute top-8 right-2 z-10">
          <div className="bg-red-500/20 backdrop-blur-sm rounded px-2 py-1 border border-red-500/30">
            <div className="text-red-400 text-xs font-medium">FROZEN</div>
            <div className="text-red-400 text-xs">Next Open:</div>
            <div className="text-red-400 text-xs">{marketStatus.nextOpenTime?.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Current price */}
      {typeof currentPrice === 'number' && !isNaN(currentPrice) && !isLoading && (
        <div className="absolute top-2 left-2 z-10">
          <div className={`backdrop-blur-sm rounded px-2 py-1 ${marketStatus.isOpen ? 'bg-black/50' : 'bg-gray-600/50'}`}>
            <span className={`text-sm font-mono ${marketStatus.isOpen ? 'text-white' : 'text-gray-300'}`}>
              {formatPrice(currentPrice)}
            </span>
            <div className={`text-xs ${marketStatus.isOpen ? 'text-emerald-400' : 'text-gray-400'}`}>
              {marketStatus.isOpen ? 'LIVE' : 'FROZEN'}
            </div>
          </div>
        </div>
      )}

      {/* Entry price badge */}
      {typeof entryPrice === 'number' && !isNaN(entryPrice) && (
        <div className="absolute top-12 left-2 z-10">
          <div className="bg-blue-500/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-white text-xs font-mono">Entry: {formatPrice(entryPrice)}</span>
          </div>
        </div>
      )}

      {/* Empty states */}
      {!marketStatus.isOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-gray-600/50 backdrop-blur-sm rounded px-4 py-3 text-center">
            <div className="text-gray-300 text-sm font-medium mb-1">Market Closed</div>
            <div className="text-gray-400 text-xs">Chart data is frozen</div>
            <div className="text-gray-400 text-xs mt-1">Next open: {marketStatus.nextOpenTime?.toLocaleString()}</div>
          </div>
        </div>
      )}

      {!hasValidData && marketStatus.isOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-2">
            <span className="text-white text-sm">
              {isLoading ? 'Loading live data...' : isConnected ? 'Preparing live feed...' : 'Connecting to live feed...'}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full h-48 p-4">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer>
            <CandlestickChart
              data={candles}
              yDomain={yDomain}
              positiveColor="hsl(var(--chart-2))"
              negativeColor="hsl(var(--destructive))"
              xTickFontSize={8}
              yTickFontSize={8}
            />
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default RealTimeChart;
