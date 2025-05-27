
import React from 'react';
import { TrendingUp, TrendingDown, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface RealTimePriceDisplayProps {
  currentPrice: number | null;
  change: number;
  percentage: number;
  lastUpdateTime: string;
  dataSource: string;
  isConnected: boolean;
  isMarketOpen: boolean;
}

const RealTimePriceDisplay = ({
  currentPrice,
  change,
  percentage,
  lastUpdateTime,
  dataSource,
  isConnected,
  isMarketOpen
}: RealTimePriceDisplayProps) => {
  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  const isLoading = !currentPrice && dataSource.includes('Loading');

  return (
    <div className="flex items-center justify-between p-2 bg-black/20 rounded">
      {/* Price and Change */}
      <div className="flex items-center space-x-3">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="text-gray-400 text-sm">Loading live data...</span>
          </div>
        ) : currentPrice ? (
          <>
            <div className="text-white text-lg font-mono">
              {formatPrice(currentPrice)}
            </div>
            <div className={`flex items-center space-x-1 ${changeColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-mono">
                {isPositive ? '+' : ''}{change.toFixed(5)}
              </span>
              <span className="text-xs">
                ({isPositive ? '+' : ''}{percentage.toFixed(2)}%)
              </span>
            </div>
          </>
        ) : (
          <div className="text-gray-400 text-sm">No price data</div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="flex items-center space-x-2 text-xs">
        {/* Market Status */}
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          isMarketOpen 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
        </span>

        {/* Connection Status */}
        <div className={`flex items-center space-x-1 ${
          isConnected ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isConnected ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span>
            {isLoading ? 'LOADING' : isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Data Source and Update Time */}
        <div className="text-gray-400">
          <div className="text-xs">{dataSource}</div>
          {lastUpdateTime && !isLoading && (
            <div className="text-xs">Updated: {lastUpdateTime}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimePriceDisplay;
