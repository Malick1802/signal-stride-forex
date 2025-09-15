
import React from 'react';
import { Activity, TrendingUp, Clock, Bot } from 'lucide-react';

interface SignalStatsProps {
  signalsCount: number;
  avgConfidence: number;
  lastUpdate: string;
}

const SignalStats = ({ signalsCount, avgConfidence, lastUpdate }: SignalStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-emerald-400" />
          <div>
            <div className="text-emerald-400 text-2xl font-bold">{signalsCount}/27</div>
            <div className="text-gray-400 text-sm">Active Signals</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-blue-400 text-2xl font-bold">{avgConfidence}%</div>
            <div className="text-gray-400 text-sm">Avg Confidence</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center space-x-3">
          <Bot className="h-8 w-8 text-purple-400" />
          <div>
            <div className="text-purple-400 text-2xl font-bold">AI</div>
            <div className="text-gray-400 text-sm">Automated</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center space-x-3">
          <Clock className="h-8 w-8 text-orange-400" />
          <div>
            <div className="text-orange-400 text-lg font-bold">
              {lastUpdate || 'Never'}
            </div>
            <div className="text-gray-400 text-sm">Last Update</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalStats;
