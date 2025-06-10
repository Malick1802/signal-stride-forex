
import React from 'react';
import { TrendingUp, TrendingDown, Shield } from 'lucide-react';

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
  confidence,
  isMarketOpen
}: SignalHeaderProps) => {
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
        </div>
        <div className="flex items-center space-x-1">
          <Shield className="h-4 w-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-medium">{confidence}%</span>
        </div>
      </div>
    </div>
  );
};

export default SignalHeader;
