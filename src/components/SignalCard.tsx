
import React, { memo } from 'react';
import { TrendingUp, TrendingDown, Target, Shield, Clock, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RealTimeChart from './RealTimeChart';

interface SignalCardProps {
  signal: any;
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: () => void;
}

const SignalCard = memo(({ signal, analysis, analyzingSignal, onGetAIAnalysis }: SignalCardProps) => {
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toFixed(5);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {signal.type === 'BUY' ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
            <span className="text-white font-bold text-lg">{signal.pair}</span>
            {signal.type === 'BUY' ? (
              <span className="text-emerald-400 font-medium">BUY</span>
            ) : (
              <span className="text-red-400 font-medium">SELL</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-white font-bold">{signal.confidence}%</div>
          <div className="text-gray-400 text-xs">Confidence</div>
        </div>
      </div>

      {/* Price Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Entry Price</span>
          <span className="text-white font-mono">{formatPrice(signal.entryPrice)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Stop Loss</span>
          <span className="text-red-400 font-mono">{formatPrice(signal.stopLoss)}</span>
        </div>
        
        {/* Take Profit Levels */}
        <div className="space-y-1">
          <span className="text-gray-400 text-sm">Take Profit Levels</span>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-emerald-400 text-xs">TP1</span>
              <span className="text-emerald-400 font-mono text-sm">{formatPrice(signal.takeProfit1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-300 text-xs">TP2</span>
              <span className="text-emerald-300 font-mono text-sm">{formatPrice(signal.takeProfit2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-200 text-xs">TP3</span>
              <span className="text-emerald-200 font-mono text-sm">{formatPrice(signal.takeProfit3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4">
        <RealTimeChart
          priceData={signal.chartData || []}
          signalType={signal.type}
          currentPrice={parseFloat(signal.entryPrice)}
          isConnected={true}
          entryPrice={parseFloat(signal.entryPrice)}
          isLoading={false}
        />
      </div>

      {/* Analysis */}
      <div className="space-y-3">
        <div className="p-3 bg-black/20 rounded-lg">
          <p className="text-gray-300 text-sm leading-relaxed">
            {signal.analysisText}
          </p>
        </div>

        {analysis[signal.id] && (
          <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Additional AI Analysis</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {analysis[signal.id]}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>{formatTime(signal.timestamp)}</span>
          </div>
          <Button
            onClick={onGetAIAnalysis}
            disabled={analyzingSignal === signal.id}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {analyzingSignal === signal.id ? (
              <>
                <div className="animate-spin h-3 w-3 border border-white/20 border-t-white rounded-full mr-1"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-3 w-3 mr-1" />
                Get AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

SignalCard.displayName = 'SignalCard';

export default SignalCard;
