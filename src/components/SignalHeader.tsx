
import React from 'react';
import { TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { calculateSignalPerformance } from '@/utils/pipCalculator';

interface SignalHeaderProps {
  pair: string;
  type: string;
  currentPrice: number;
  confidence: number;
  isMarketOpen: boolean;
  change: number;
  percentage: number;
  dataSource: string;
  lastUpdateTime: string;
  entryPrice?: number;
}

const SignalHeader = ({
  pair,
  type,
  currentPrice,
  confidence,
  isMarketOpen,
  change,
  percentage,
  dataSource,
  lastUpdateTime,
  entryPrice
}: SignalHeaderProps) => {
  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  // Calculate signal performance using the proper pip calculator
  const signalPerformance = entryPrice && currentPrice ? 
    calculateSignalPerformance(entryPrice, currentPrice, type as 'BUY' | 'SELL', pair) : 
    { pips: 0, percentage: 0, isProfit: false };

  const showSignalPerformance = entryPrice && currentPrice;

  return (
    <div className="p-4 border-b border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-white">{pair}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">FOREX</span>
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            type === 'BUY' 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {type}
          </span>
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            isMarketOpen 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {isMarketOpen ? 'LIVE' : 'CLOSED'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {type === 'BUY' ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400" />
          )}
          <span className="text-white text-lg font-mono">{formatPrice(currentPrice)}</span>
          <div className="flex flex-col text-xs text-gray-400">
            <span>{dataSource}</span>
            {lastUpdateTime && <span>Updated: {lastUpdateTime}</span>}
            {entryPrice && (
              <span>Entry: {formatPrice(entryPrice)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {showSignalPerformance ? (
            <div className="flex flex-col items-end">
              <span className={`text-sm font-mono ${
                signalPerformance.isProfit ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {signalPerformance.isProfit ? '+' : ''}{signalPerformance.pips} pips
              </span>
              <span className={`text-xs font-mono ${
                signalPerformance.isProfit ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {signalPerformance.isProfit ? '+' : ''}{signalPerformance.percentage.toFixed(2)}%
              </span>
            </div>
          ) : (
            <span className={`text-sm font-mono ${
              change >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {change >= 0 ? '+' : ''}{change.toFixed(5)} ({percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%)
            </span>
          )}
          <Shield className="h-4 w-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">{confidence}%</span>
        </div>
      </div>
    </div>
  );
};

export default SignalHeader;
