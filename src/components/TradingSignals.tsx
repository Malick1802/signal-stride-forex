
import React, { useState } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import ErrorDisplay from './ErrorDisplay';

const TradingSignals = () => {
  const {
    signals,
    loading,
    analyzingSignal,
    analysis,
    isGenerating,
    lastGenerationError,
    generateSignals,
    getAIAnalysis
  } = useTradingSignals();

  // Get available pairs from signals
  const availablePairs = Array.from(new Set(signals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  // Filter signals for selected pair
  const filteredSignals = selectedPair === 'All' ? signals : signals.filter(signal => signal.pair === selectedPair);

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
        isGenerating={isGenerating}
        onGenerateSignals={generateSignals}
      />

      {/* Error Debug Information */}
      <ErrorDisplay lastGenerationError={lastGenerationError} />

      {/* Pair Filter */}
      {availablePairs.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
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
                analysis={analysis}
                analyzingSignal={analyzingSignal}
                onGetAIAnalysis={getAIAnalysis}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' ? 'No active signals available' : `No signals available for ${selectedPair}`}
            </div>
            <button
              onClick={generateSignals}
              disabled={isGenerating}
              className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Signals'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSignals;
