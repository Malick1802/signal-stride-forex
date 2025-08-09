import React, { useState, useEffect } from 'react';
import { ChevronDown, Activity, Clock, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TradingChart from '../TradingChart';
import { useRealTimeMarketData } from '@/hooks/useRealTimeMarketData';
import { Badge } from '@/components/ui/badge';

const CURRENCY_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'CHF/JPY', 'EUR/CHF', 'AUD/JPY'
];

export const MobileChartsView: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState('1H');
  const { currentPrice, isConnected, lastUpdateTime } = useRealTimeMarketData({ 
    pair: selectedPair, 
    entryPrice: 1.0000 
  });

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const timeframes = [
    { value: '1M', label: '1 Min' },
    { value: '5M', label: '5 Min' },
    { value: '15M', label: '15 Min' },
    { value: '1H', label: '1 Hour' },
    { value: '4H', label: '4 Hour' },
    { value: '1D', label: '1 Day' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {/* Header */}
      <div className="pt-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Live Charts</h1>
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex space-x-3">
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="flex-1 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {CURRENCY_PAIRS.map((pair) => (
                  <SelectItem key={pair} value={pair} className="text-white">
                    {pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value} className="text-white">
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Info */}
          <Card className="p-4 bg-slate-800/50 border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-white">
                  {selectedPair}
                </div>
                <div className="text-sm text-gray-400">
                  {timeframe} Chart
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono text-emerald-400">
                  {currentPrice ? formatPrice(currentPrice) : '---'}
                </div>
                {lastUpdateTime && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(lastUpdateTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Chart Container */}
      <Card className="bg-slate-800/30 border-slate-700 overflow-hidden">
        <div className="h-[400px]">
          <TradingChart
            selectedPair={selectedPair}
            onPairChange={setSelectedPair}
            availablePairs={CURRENCY_PAIRS}
          />
        </div>
      </Card>

      {/* Chart Info */}
      <div className="mt-4 space-y-2">
        <Card className="p-3 bg-slate-800/30 border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Data Source</span>
            <span className="text-white">Real-time Market Feed</span>
          </div>
        </Card>
        
        <Card className="p-3 bg-slate-800/30 border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Update Rate</span>
            <span className="text-white">Every 1-5 seconds</span>
          </div>
        </Card>
        
        <div className="text-center pt-4">
          <p className="text-xs text-gray-500">
            Charts are for informational purposes only
          </p>
        </div>
      </div>
    </div>
  );
};