
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

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
  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const chartConfig = {
    price: {
      label: "Price",
      color: signalType === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  return (
    <div className="h-48 p-4">
      <ChartContainer config={chartConfig}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.5)"
              fontSize={8}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)"
              fontSize={8}
              domain={['dataMin - 0.0005', 'dataMax + 0.0005']}
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
              stroke={signalType === 'BUY' ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default SignalChart;
