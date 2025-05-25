
import React, { useState } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap } from 'lucide-react';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';

const TradingSignals = () => {
  const { signals, loading, lastUpdate, fetchSignals } = useTradingSignals();
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

  // Generate test signals function
  const handleGenerateTestSignals = async () => {
    setGeneratingSignals(true);
    
    try {
      console.log('Manually triggering signal generation...');
      
      // First fetch market data
      const { data: marketResponse, error: marketError } = await supabase.functions.invoke('fetch-market-data');
      
      if (marketError) {
        console.error('Market data fetch error:', marketError);
        toast({
          title: "Market Data Error",
          description: "Failed to fetch fresh market data. Using existing data.",
          variant: "destructive"
        });
      } else {
        console.log('Market data fetched:', marketResponse);
        toast({
          title: "Market Data Updated",
          description: "Fresh market data fetched successfully.",
        });
      }
      
      // Wait a moment for market data to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Then generate signals
      const { data: signalResponse, error: signalError } = await supabase.functions.invoke('generate-signals');

      if (signalError) {
        console.error('Signal generation error:', signalError);
        toast({
          title: "Signal Generation Error",
          description: `Failed to generate signals: ${signalError.message}`,
          variant: "destructive"
        });
        return;
      }

      console.log('Signal generation response:', signalResponse);
      
      if (signalResponse?.success) {
        toast({
          title: "Signals Generated!",
          description: `Successfully generated ${signalResponse.signals?.length || 0} new signals`,
        });
        
        // Refresh the signals list without page reload
        await fetchSignals();
      } else {
        toast({
          title: "No New Signals",
          description: signalResponse?.message || "No new signals were generated at this time",
        });
      }
    } catch (error) {
      console.error('Error generating test signals:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate test signals. Please try again.",
        variant: "destructive"
      });
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

      {/* Control Panel */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm font-medium">Signal Controls:</span>
            <Button
              onClick={handleGenerateTestSignals}
              disabled={generatingSignals}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generatingSignals ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {generatingSignals ? 'Generating...' : 'Generate Test Signals'}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🤖 Automated AI signals • Market hours: Mon-Fri 00:00-22:00 UTC
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
                onGetAIAnalysis={handleGetAIAnalysis}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? 'No active signals available - Click "Generate Test Signals" to create some now' 
                : `No signals available for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500">
              Automated signal generation runs every 30 minutes during forex market hours
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSignals;
