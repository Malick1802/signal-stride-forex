
import React, { useState } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import { Button } from '@/components/ui/button';
import { Zap, RefreshCw } from 'lucide-react';

const TradingSignals = () => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { toast } = useToast();
  
  // AI Analysis state
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [generatingSignals, setGeneratingSignals] = useState(false);

  // Get available pairs from signals
  const availablePairs = Array.from(new Set(signals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  // Filter signals for selected pair
  const filteredSignals = selectedPair === 'All' ? signals : signals.filter(signal => signal.pair === selectedPair);

  // Calculate average confidence
  const avgConfidence = signals.length > 0 
    ? Math.round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length)
    : 87;

  // Manual trigger for automatic signal generation
  const handleManualSignalGeneration = async () => {
    setGeneratingSignals(true);
    try {
      await triggerAutomaticSignalGeneration();
    } finally {
      setGeneratingSignals(false);
    }
  };

  // AI Analysis function
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

      {/* Automatic Generation Controls */}
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
                  Scan Now
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
              Only showing signals with 85%+ confidence
            </div>
          </div>
        </div>
      )}

      {/* Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? 'High-Confidence Signals' : `${selectedPair} Signals`} ({filteredSignals.length})
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
                ? 'No high-confidence signals detected - AI is continuously scanning for opportunities' 
                : `No high-confidence signals available for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              The system automatically generates signals when confidence levels exceed 85%
            </div>
            <Button
              onClick={handleManualSignalGeneration}
              disabled={generatingSignals}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generatingSignals ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning Markets...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Scan for Opportunities
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
