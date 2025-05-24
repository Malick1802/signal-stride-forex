import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Shield, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PriceData {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
}

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit1: string;
    takeProfit2: string;
    takeProfit3: string;
    confidence: number;
    timestamp: string;
    analysisText?: string;
    chartData: Array<{ time: number; price: number }>;
  };
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: (signalId: string) => void;
}

const SignalCard = ({ signal, analysis, analyzingSignal, onGetAIAnalysis }: SignalCardProps) => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // Generate realistic price movements for the signal's pair
  const generatePriceMovement = (basePrice: number, previousData: PriceData[]) => {
    const lastPrice = previousData.length > 0 ? previousData[previousData.length - 1].price : basePrice;
    const volatility = 0.0001; // Lower volatility for cards
    const trend = signal.type === 'BUY' ? 0.00005 : -0.00005; // Slight trend based on signal type
    const randomMove = (Math.random() - 0.5) * volatility;
    return lastPrice + trend + randomMove;
  };

  const getPairBasePrice = (pair: string): number => {
    const basePrices: Record<string, number> = {
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650,
      'USD/JPY': 148.50,
      'AUD/USD': 0.6720,
      'USD/CAD': 1.3580,
      'EUR/GBP': 0.8590,
      'EUR/JPY': 161.20,
      'GBP/JPY': 187.80,
      'AUD/JPY': 99.85,
      'USD/CHF': 0.8920,
      'EUR/CHF': 0.9580,
      'GBP/CHF': 1.1290,
      'AUD/CHF': 0.5990,
      'CAD/CHF': 0.6570,
      'CHF/JPY': 166.45
    };
    return basePrices[pair] || parseFloat(signal.entryPrice) || 1.0000;
  };

  // Initialize chart data
  useEffect(() => {
    const basePrice = getPairBasePrice(signal.pair);
    const now = Date.now();
    const data: PriceData[] = [];

    // Generate 30 data points for card chart
    for (let i = 29; i >= 0; i--) {
      const timestamp = now - (i * 120000); // 2 minute intervals
      const price = generatePriceMovement(basePrice, data);
      data.push({
        timestamp,
        time: new Date(timestamp).toLocaleTimeString(),
        price,
        volume: Math.random() * 500000
      });
    }

    setPriceData(data);
    setCurrentPrice(data[data.length - 1]?.price || basePrice);
  }, [signal.pair, signal.entryPrice]);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPriceData(prevData => {
        const now = Date.now();
        const newPrice = generatePriceMovement(getPairBasePrice(signal.pair), prevData);
        
        const newDataPoint: PriceData = {
          timestamp: now,
          time: new Date(now).toLocaleTimeString(),
          price: newPrice,
          volume: Math.random() * 500000
        };

        setCurrentPrice(newPrice);

        // Keep last 30 data points for card
        const updatedData = [...prevData, newDataPoint].slice(-30);
        return updatedData;
      });
    }, 3000); // Update every 3 seconds for cards

    return () => clearInterval(interval);
  }, [signal.pair]);

  const chartConfig = {
    price: {
      label: "Price",
      color: signal.type === 'BUY' ? "#10b981" : "#ef4444",
    },
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const getPriceChange = () => {
    if (priceData.length < 2) return { change: 0, percentage: 0 };
    const current = priceData[priceData.length - 1]?.price || 0;
    const previous = priceData[0]?.price || 0;
    const change = current - previous;
    const percentage = (change / previous) * 100;
    return { change, percentage };
  };

  const { change, percentage } = getPriceChange();

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">{signal.pair}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">FOREX</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              signal.type === 'BUY' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {signal.type}
            </span>
          </div>
        </div>
        
        {/* Current Price and Change */}
        {currentPrice && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {signal.type === 'BUY' ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className="text-white text-lg font-mono">{formatPrice(currentPrice)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className={`text-sm font-mono ${
                change >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {change >= 0 ? '+' : ''}{change.toFixed(5)} ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
              </span>
              <Shield className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-medium">{signal.confidence}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Trading Chart */}
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
                tick={{ fontSize: 8 }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)"
                fontSize={8}
                domain={['dataMin - 0.0005', 'dataMax + 0.0005']}
                tickFormatter={formatPrice}
                tick={{ fontSize: 8 }}
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
                stroke={signal.type === 'BUY' ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {/* Entry Price Line */}
              <Line
                type="monotone"
                dataKey={() => parseFloat(signal.entryPrice)}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Signal Details */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Entry Price</span>
          <span className="text-white font-mono">{signal.entryPrice}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Stop Loss</span>
          <span className="text-red-400 font-mono">{signal.stopLoss}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 1</span>
            <span className="text-emerald-400 font-mono">{signal.takeProfit1}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 2</span>
            <span className="text-emerald-400 font-mono">{signal.takeProfit2}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 3</span>
            <span className="text-emerald-400 font-mono">{signal.takeProfit3}</span>
          </div>
        </div>

        {/* AI Analysis Section with Collapsible */}
        <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400">AI Analysis</span>
                </div>
                {isAnalysisOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-3">
            {signal.analysisText && (
              <div className="mb-3">
                <div className="text-gray-400 text-xs mb-2">Quick Analysis:</div>
                <div className="text-white text-xs bg-black/20 rounded p-2">
                  {signal.analysisText}
                </div>
              </div>
            )}

            {analysis[signal.id] && (
              <div>
                <div className="text-blue-400 text-xs mb-2">Detailed Analysis:</div>
                <div className="text-white text-xs bg-blue-500/10 rounded p-2 max-h-40 overflow-y-auto">
                  {analysis[signal.id]}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{new Date(signal.timestamp).toLocaleTimeString()}</span>
            </div>
            <button
              onClick={() => onGetAIAnalysis(signal.id)}
              disabled={analyzingSignal === signal.id}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              <Brain className={`h-4 w-4 ${analyzingSignal === signal.id ? 'animate-pulse' : ''}`} />
              <span className="text-xs">
                {analyzingSignal === signal.id ? 'Analyzing...' : 'Refresh Analysis'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
