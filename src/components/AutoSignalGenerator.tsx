
import React from 'react';
import { useAutomaticSignalGeneration } from '@/hooks/useAutomaticSignalGeneration';
import { Button } from '@/components/ui/button';
import { Play, Pause, Clock, Activity, TrendingUp, Zap } from 'lucide-react';

const AutoSignalGenerator = () => {
  const {
    isAutoGenerationActive,
    generationsThisSession,
    nextGenerationIn,
    maxSignalsPerSession,
    intervalMinutes,
    isMarketOpen,
    canGenerateSignals,
    startAutoGeneration,
    stopAutoGeneration,
    performAutomaticGeneration
  } = useAutomaticSignalGeneration();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!isAutoGenerationActive) return 'text-gray-400';
    if (!isMarketOpen) return 'text-yellow-400';
    if (!canGenerateSignals) return 'text-orange-400';
    return 'text-emerald-400';
  };

  const getStatusText = () => {
    if (!isAutoGenerationActive) return 'INACTIVE';
    if (!isMarketOpen) return 'MARKET CLOSED';
    if (generationsThisSession >= maxSignalsPerSession) return 'SESSION LIMIT REACHED';
    return 'ACTIVE';
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className={`h-5 w-5 ${isAutoGenerationActive ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-white font-medium">Auto Signal Generation</span>
            <span className={`text-xs px-2 py-1 rounded ${getStatusColor()} bg-current/20`}>
              {getStatusText()}
            </span>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-gray-300">
                Interval: {intervalMinutes}min
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <span className="text-gray-300">
                Generated: {generationsThisSession}/{maxSignalsPerSession}
              </span>
            </div>
            
            {isAutoGenerationActive && nextGenerationIn > 0 && (
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">
                  Next in: {formatTime(nextGenerationIn)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex space-x-2">
          <Button
            onClick={performAutomaticGeneration}
            disabled={!canGenerateSignals || !isMarketOpen}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Generate Now
          </Button>
          
          <Button
            onClick={isAutoGenerationActive ? stopAutoGeneration : startAutoGeneration}
            className={`text-white text-sm ${
              isAutoGenerationActive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            size="sm"
          >
            {isAutoGenerationActive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Auto
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Auto
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Additional Status Info */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>
              Market: {isMarketOpen ? '🟢 Open' : '🔴 Closed'}
            </span>
            <span>
              System: {isAutoGenerationActive ? '🟢 Running' : '⚪ Stopped'}
            </span>
            <span>
              Can Generate: {canGenerateSignals ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            🤖 AI-powered centralized signal generation • Runs every {intervalMinutes} minutes during market hours
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoSignalGenerator;
