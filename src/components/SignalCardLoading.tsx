
import React from 'react';

interface SignalCardLoadingProps {
  pair: string;
}

const SignalCardLoading = ({ pair }: SignalCardLoadingProps) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      <div className="text-center">
        <div className="text-xl font-bold text-white mb-2">{pair}</div>
        <div className="text-gray-400 mb-4">Loading market data...</div>
        <div className="animate-pulse bg-white/10 h-4 w-3/4 mx-auto rounded"></div>
      </div>
    </div>
  );
};

export default SignalCardLoading;
