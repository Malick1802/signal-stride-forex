
import React, { useState } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import ErrorDisplay from './ErrorDisplay';
import TradingChart from './TradingChart';

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
  const defaultPair = availablePairs.length > 0 ? availablePairs[0] : 'EUR/USD';
  
  const [selectedPair, setSelectedPair] = useState(defaultPair);

  // Update selected pair when signals change
  React.useEffect(() => {
    if (availablePairs.length > 0 && !availablePairs.includes(selectedPair)) {
      setSelectedPair(availablePairs[0]);
    }
  }, [availablePairs, selectedPair]);

  // Filter signals for selected pair
  const filteredSignals = selectedPair ? signals.filter(signal => signal.pair === selectedPair) : signals;

  if (loading && signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading signals...</div>
      </div>
    );
  }

  // All major currency pairs for the chart
  const allMajorPairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'USD/CHF',
    'EUR/CHF', 'GBP/CHF', 'AUD/CHF', 'CAD/CHF', 'CHF/JPY'
  ];

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

      {/* Trading Chart */}
      <TradingChart 
        selectedPair={selectedPair}
        onPairChange={setSelectedPair}
        availablePairs={allMajorPairs}
      />

      {/* Signals for Selected Pair */}
      {selectedPair && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <h3 className="text-white text-lg font-semibold mb-4">
            Signals for {selectedPair} ({filteredSignals.length})
          </h3>
          
          {filteredSignals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="text-gray-400">No signals available for {selectedPair}</div>
            </div>
          )}
        </div>
      )}

      {/* All Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">All Active Signals</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {signals.map(signal => (
            <SignalCard
              key={signal.id}
              signal={signal}
              analysis={analysis}
              analyzingSignal={analyzingSignal}
              onGetAIAnalysis={getAIAnalysis}
            />
          ))}
        </div>
      </div>

      {signals.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No active signals available</div>
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
  );
};

export default TradingSignals;
