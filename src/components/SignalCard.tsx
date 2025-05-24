
import React from 'react';
import { TrendingUp, TrendingDown, Clock, Shield, Brain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit1: string;
    takeProfit2: string;
    takeProfit3: string;
    confidence: number;
    timestamp: string;
    analysisText?: string;
    chartData: Array<{ time: number; price: number }>;
  };
  analysis: Record<string, string>;
  analyzingSignal: string | null;
  onGetAIAnalysis: (signalId: string) => void;
}

const SignalCard = ({ signal, analysis, analyzingSignal, onGetAIAnalysis }: SignalCardProps) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">{signal.pair}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">FOREX</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              signal.type === 'BUY' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {signal.type}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {signal.type === 'BUY' ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span className="text-gray-400 text-sm">
              {signal.type === 'BUY' ? 'BUY Signal' : 'SELL Signal'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Shield className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">{signal.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-32 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={signal.chartData}>
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={signal.type === 'BUY' ? '#10b981' : '#ef4444'} 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Signal Details */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Entry Price</span>
          <span className="text-white font-mono">{signal.entryPrice}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Stop Loss</span>
          <span className="text-red-400 font-mono">{signal.stopLoss}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 1</span>
            <span className="text-emerald-400 font-mono">{signal.takeProfit1}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 2</span>
            <span className="text-emerald-400 font-mono">{signal.takeProfit2}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Target 3</span>
            <span className="text-emerald-400 font-mono">{signal.takeProfit3}</span>
          </div>
        </div>

        {/* AI Analysis Section */}
        {signal.analysisText && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-gray-400 text-xs mb-2">AI Analysis:</div>
            <div className="text-white text-xs bg-black/20 rounded p-2">
              {signal.analysisText.length > 100 
                ? `${signal.analysisText.substring(0, 100)}...`
                : signal.analysisText
              }
            </div>
          </div>
        )}

        {/* Detailed AI Analysis */}
        {analysis[signal.id] && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-blue-400 text-xs mb-2">Detailed Analysis:</div>
            <div className="text-white text-xs bg-blue-500/10 rounded p-2 max-h-32 overflow-y-auto">
              {analysis[signal.id]}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{new Date(signal.timestamp).toLocaleTimeString()}</span>
            </div>
            <button
              onClick={() => onGetAIAnalysis(signal.id)}
              disabled={analyzingSignal === signal.id}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              <Brain className={`h-4 w-4 ${analyzingSignal === signal.id ? 'animate-pulse' : ''}`} />
              <span className="text-xs">
                {analyzingSignal === signal.id ? 'Analyzing...' : 'AI Analysis'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
