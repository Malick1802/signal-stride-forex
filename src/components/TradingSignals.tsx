
import React, { useState } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';

const TradingSignals = () => {
  const { signals, loading, lastUpdate } = useTradingSignals();

  // Get available pairs from signals
  const availablePairs = Array.from(new Set(signals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  // Filter signals for selected pair
  const filteredSignals = selectedPair === 'All' ? signals : signals.filter(signal => signal.pair === selectedPair);

  // Calculate average confidence
  const avgConfidence = signals.length > 0 
    ? Math.round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length)
    : 87;

  if (loading && signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading signals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <SignalStats 
        signalsCount={signals.length}
        avgConfidence={avgConfidence}
        lastUpdate={lastUpdate}
      />

      {/* Pair Filter */}
      {availablePairs.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm font-medium">Filter by pair:</span>
              <select
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All" className="bg-gray-800 text-white">All Pairs ({signals.length})</option>
                {availablePairs.map(pair => (
                  <option key={pair} value={pair} className="bg-gray-800 text-white">
                    {pair} ({signals.filter(s => s.pair === pair).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400">
              🤖 Automated AI signals • Market hours: Mon-Fri 00:00-22:00 UTC
            </div>
          </div>
        </div>
      )}

      {/* Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? 'All Active Signals' : `${selectedPair} Signals`} ({filteredSignals.length})
        </h3>
        
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? 'No active signals available - AI will generate new signals automatically during market hours' 
                : `No signals available for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500">
              Next automated signal generation: Every 30 minutes during forex market hours
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSignals;
