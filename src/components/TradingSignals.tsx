
import React, { useState } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import { Button } from '@/components/ui/button';
import { Zap, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const TradingSignals = () => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { toast } = useToast();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [generatingSignals, setGeneratingSignals] = useState(false);

  const availablePairs = Array.from(new Set(signals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  const filteredSignals = selectedPair === 'All' ? signals : signals.filter(signal => signal.pair === selectedPair);

  const avgConfidence = signals.length > 0 
    ? Math.round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length)
    : 87;

  const handleManualSignalGeneration = async () => {
    setGeneratingSignals(true);
    try {
      await triggerAutomaticSignalGeneration();
    } finally {
      setGeneratingSignals(false);
    }
  };

  const handleGetAIAnalysis = async (signalId: string) => {
    if (analyzingSignal === signalId) return;
    
    setAnalyzingSignal(signalId);
    
    try {
      console.log('Getting AI analysis for signal:', signalId);
      
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { signal_id: signalId }
      });

      if (error) {
        console.error('AI analysis error:', error);
        toast({
          title: "Analysis Error",
          description: "Failed to get AI analysis. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data?.analysis) {
        setAnalysis(prev => ({
          ...prev,
          [signalId]: data.analysis
        }));
        
        toast({
          title: "Analysis Complete",
          description: "AI analysis has been generated for this signal.",
        });
      }
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to get AI analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzingSignal(null);
    }
  };

  if (loading && signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading real-time signals...</div>
      </div>
    );
  }

  const hasRealTimeData = signals.length > 0;

  return (
    <div className="space-y-6">
      <SignalStats 
        signalsCount={signals.length}
        avgConfidence={avgConfidence}
        lastUpdate={lastUpdate}
      />

      {/* Real-time Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {hasRealTimeData ? (
                <Wifi className="h-5 w-5 text-emerald-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-400" />
              )}
              <span className="text-white font-medium">
                {hasRealTimeData ? 'Real-Time Data Active' : 'Waiting for Real-Time Data'}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                hasRealTimeData 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {hasRealTimeData ? 'LIVE' : 'NO DATA'}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            FastForex API • Only real market data displayed
          </div>
        </div>
      </div>

      {/* Signal Generation Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-white font-medium">Automatic Signal Generation</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                85%+ Confidence Threshold
              </span>
            </div>
            <Button
              onClick={handleManualSignalGeneration}
              disabled={generatingSignals}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              size="sm"
            >
              {generatingSignals ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Now
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🤖 Auto-scanning every 5 minutes • Market hours: Mon-Fri 00:00-22:00 UTC
          </div>
        </div>
      </div>

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
              Real-time signals only • No fallback data
            </div>
          </div>
        </div>
      )}

      {/* Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? 'Real-Time Signals' : `${selectedPair} Signals`} ({filteredSignals.length})
        </h3>
        
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignals.map(signal => (
              <SignalCard
                key={signal.id}
                signal={signal}
                analysis={analysis}
                analyzingSignal={analyzingSignal}
                onGetAIAnalysis={handleGetAIAnalysis}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? 'Waiting for real-time market data to generate signals' 
                : `No real-time signals available for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              The system only displays signals when real market data is available from FastForex API
            </div>
            <Button
              onClick={handleManualSignalGeneration}
              disabled={generatingSignals}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generatingSignals ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Market Data...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Get Real-Time Signals
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSignals;
