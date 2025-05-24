
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SignalStatsProps {
  signalsCount: number;
  isGenerating: boolean;
  onGenerateSignals: () => void;
}

const SignalStats = ({ signalsCount, isGenerating, onGenerateSignals }: SignalStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="text-emerald-400 text-2xl font-bold">{signalsCount}</div>
        <div className="text-gray-400 text-sm">Active Signals</div>
      </div>
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="text-blue-400 text-2xl font-bold">87%</div>
        <div className="text-gray-400 text-sm">AI Confidence</div>
      </div>
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="text-purple-400 text-2xl font-bold">Live</div>
        <div className="text-gray-400 text-sm">FastForex Data</div>
      </div>
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <button
          onClick={onGenerateSignals}
          disabled={isGenerating}
          className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span className="text-sm">
            {isGenerating ? 'Generating...' : 'Generate New'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default SignalStats;
