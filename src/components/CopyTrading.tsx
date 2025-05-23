
import React, { useState } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Settings, TrendingUp } from 'lucide-react';

const CopyTrading = ({ user }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [riskLevel, setRiskLevel] = useState([3]);
  const [lotSize, setLotSize] = useState([0.1]);
  const [maxTrades, setMaxTrades] = useState([5]);

  return (
    <div className="space-y-6">
      {/* Copy Trading Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Copy Trading</h2>
            <p className="text-gray-400">Automatically follow AI-generated signals</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {isEnabled ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              <span className="font-medium">{isEnabled ? 'Active' : 'Paused'}</span>
            </div>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isEnabled 
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isEnabled ? 'Pause Trading' : 'Start Trading'}
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">
              Risk Level: {riskLevel[0]}/10
            </label>
            <Slider
              value={riskLevel}
              onValueChange={setRiskLevel}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400">Higher values = more aggressive trading</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">
              Lot Size: {lotSize[0]}
            </label>
            <Slider
              value={lotSize}
              onValueChange={setLotSize}
              max={2}
              min={0.01}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-gray-400">Size of each trade position</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">
              Max Concurrent Trades: {maxTrades[0]}
            </label>
            <Slider
              value={maxTrades}
              onValueChange={setMaxTrades}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400">Maximum open positions</p>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">+$4,250</div>
          <div className="text-gray-400 text-sm">Total P&L</div>
          <div className="text-emerald-400 text-xs mt-1">+12.5% this month</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-blue-400 text-2xl font-bold">89%</div>
          <div className="text-gray-400 text-sm">Win Rate</div>
          <div className="text-blue-400 text-xs mt-1">156 wins / 175 total</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-purple-400 text-2xl font-bold">24</div>
          <div className="text-gray-400 text-sm">Active Trades</div>
          <div className="text-purple-400 text-xs mt-1">5 pending orders</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-orange-400 text-2xl font-bold">2.3</div>
          <div className="text-gray-400 text-sm">Avg Risk/Reward</div>
          <div className="text-orange-400 text-xs mt-1">Optimal ratio</div>
        </div>
      </div>

      {/* Active Positions */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Active Positions</h3>
          <p className="text-gray-400 text-sm">Currently running copy trades</p>
        </div>
        
        <div className="p-4 space-y-4">
          {[
            { pair: 'EURUSD', type: 'BUY', size: 0.5, entry: 1.0876, current: 1.0891, pnl: '+75.00' },
            { pair: 'GBPUSD', type: 'SELL', size: 0.3, entry: 1.2654, current: 1.2649, pnl: '+15.00' },
            { pair: 'USDJPY', type: 'BUY', size: 0.2, entry: 153.45, current: 153.52, pnl: '+14.00' }
          ].map((position, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-white font-medium">{position.pair}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  position.type === 'BUY' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {position.type}
                </span>
                <span className="text-gray-400 text-sm">Size: {position.size}</span>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <div className="text-gray-400">Entry</div>
                  <div className="text-white font-mono">{position.entry}</div>
                </div>
                <div>
                  <div className="text-gray-400">Current</div>
                  <div className="text-white font-mono">{position.current}</div>
                </div>
                <div>
                  <div className="text-gray-400">P&L</div>
                  <div className="text-emerald-400 font-mono">{position.pnl}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CopyTrading;
