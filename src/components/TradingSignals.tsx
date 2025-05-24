
import React from 'react';
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

      {/* Signals Grid */}
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
