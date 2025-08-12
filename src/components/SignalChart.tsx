
import React, { useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import CandlestickChart from '@/components/charts/Candlestick';
import { bucketTicksToOHLC, getPriceExtent } from '@/utils/ohlc';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

interface SignalChartProps {
  priceData: PriceData[];
  signalType: string;
}

const SignalChart = ({ priceData, signalType }: SignalChartProps) => {
  const chartConfig = {
    price: {
      label: 'Price',
      color: signalType === 'BUY' ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))',
    },
  };

  const candles = useMemo(() => bucketTicksToOHLC(priceData as any, 60_000), [priceData]);
  const extent = useMemo(() => getPriceExtent(candles), [candles]);
  const yDomain = useMemo<[number, number]>(() => {
    const diff = extent.max - extent.min;
    const pad = diff > 0 ? diff * 0.05 : 0.0005;
    return [extent.min - pad, extent.max + pad];
  }, [extent]);

  return (
    <div className="h-48 p-4">
      <ChartContainer config={chartConfig}>
        <ResponsiveContainer width="100%" height="100%">
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
  );
};

export default SignalChart;
