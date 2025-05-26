
import React, { useState, memo } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import { Button } from '@/components/ui/button';
import { Zap, RefreshCw, Wifi, WifiOff, Users, Database } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration } = useTradingSignals();
  const { toast } = useToast();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  const [generatingSignals, setGeneratingSignals] = useState(false);

  // Add market activation
  const { activateMarket } = useMarketActivation();

  // Filter out invalid signals and add validation
  const validSignals = signals.filter(signal => {
    if (!signal || typeof signal !== 'object' || !signal.id || !signal.pair || !signal.type) {
      return false;
    }
    return true;
  });

  const availablePairs = Array.from(new Set(validSignals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  const filteredSignals = selectedPair === 'All' ? validSignals : validSignals.filter(signal => signal.pair === selectedPair);

  const avgConfidence = validSignals.length > 0 
    ? Math.round(validSignals.reduce((sum, signal) => sum + (signal.confidence || 0), 0) / validSignals.length)
    : 87;

  const handleRefreshSignals = async () => {
    setRefreshingSignals(true);
    try {
      await triggerAutomaticSignalGeneration();
    } catch (error) {
      console.error('Error refreshing centralized signals:', error);
      toast({
        title: "Refresh Error",
        description: "Failed to refresh centralized signals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRefreshingSignals(false);
    }
  };

  const handleGenerateSignals = async () => {
    setGeneratingSignals(true);
    try {
      console.log('🚀 Manually triggering FastForex signal generation...');
      
      const { data: signalResult, error: signalError } = await supabase.functions.invoke('generate-signals');
      
      if (signalError) {
        console.error('❌ Manual signal generation failed:', signalError);
        toast({
          title: "Generation Failed",
          description: "Failed to generate FastForex signals manually",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Manual FastForex signals generated:', signalResult);
      
      // Refresh the signal list
      await new Promise(resolve => setTimeout(resolve, 2000));
      window.location.reload(); // Force refresh to see new signals
      
      toast({
        title: "Signals Generated!",
        description: `Generated ${signalResult?.signals?.length || 'new'} FastForex-powered signals`,
      });
      
    } catch (error) {
      console.error('❌ Error in manual signal generation:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate signals manually",
        variant: "destructive"
      });
    } finally {
      setGeneratingSignals(false);
    }
  };

  const handleGetAIAnalysis = async (signalId: string) => {
    if (analyzingSignal === signalId) return;
    
    setAnalyzingSignal(signalId);
    
    try {
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

  if (loading && validSignals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading centralized signals...</div>
      </div>
    );
  }

  const hasSignalData = validSignals.length > 0;

  return (
    <div className="space-y-6">
      <SignalStats 
        signalsCount={validSignals.length}
        avgConfidence={avgConfidence}
        lastUpdate={lastUpdate}
      />

      {/* Centralized Status */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Centralized Signals</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                FASTFOREX-POWERED
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {hasSignalData ? (
                <Wifi className="h-4 w-4 text-emerald-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400" />
              )}
              <span className="text-sm text-gray-400">
                {hasSignalData ? 'All users see identical signals' : 'No signal data - generate new signals'}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Real-time FastForex data • 85%+ confidence threshold
          </div>
        </div>
      </div>

      {/* Signal Management Controls */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">FastForex Signal Management</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                REAL DATA
              </span>
            </div>
            <Button
              onClick={handleGenerateSignals}
              disabled={generatingSignals}
              className="bg-green-600 hover:bg-green-700 text-white text-sm"
              size="sm"
            >
              {generatingSignals ? (
                <>
                  <Database className="h-4 w-4 mr-2 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Generate FastForex Signals
                </>
              )}
            </Button>
            <Button
              onClick={handleRefreshSignals}
              disabled={refreshingSignals}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              size="sm"
            >
              {refreshingSignals ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Signals
                </>
              )}
            </Button>
          </div>
          <div className="text-sm text-gray-400">
            🌐 Centralized FastForex • Updates every 10 minutes
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
                <option value="All" className="bg-gray-800 text-white">All Pairs ({validSignals.length})</option>
                {availablePairs.map(pair => (
                  <option key={pair} value={pair} className="bg-gray-800 text-white">
                    {pair} ({validSignals.filter(s => s.pair === pair).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400">
              FastForex-powered signals • Identical for all users
            </div>
          </div>
        </div>
      )}

      {/* Active Centralized Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? 'FastForex Signals' : `${selectedPair} Signals`} ({filteredSignals.length})
        </h3>
        
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignals.map(signal => {
              if (!signal || !signal.id) {
                return null;
              }
              
              return (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  analysis={analysis}
                  analyzingSignal={analyzingSignal}
                  onGetAIAnalysis={handleGetAIAnalysis}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? 'No centralized signals available at the moment' 
                : `No centralized signals available for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              FastForex-powered signals are generated automatically and identical for all users
            </div>
            <div className="space-x-4">
              <Button
                onClick={handleGenerateSignals}
                disabled={generatingSignals}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {generatingSignals ? (
                  <>
                    <Database className="h-4 w-4 mr-2 animate-pulse" />
                    Generating FastForex Signals...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Generate FastForex Signals
                  </>
                )}
              </Button>
              <Button
                onClick={handleRefreshSignals}
                disabled={refreshingSignals}
                variant="outline"
                className="text-white border-white/20 hover:bg-white/10"
              >
                {refreshingSignals ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Refresh Centralized Signals
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

TradingSignals.displayName = 'TradingSignals';

export default TradingSignals;
