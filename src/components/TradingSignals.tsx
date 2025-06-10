
import React, { useState, memo, useCallback } from 'react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { useEnhancedSignalMonitoring } from '@/hooks/useEnhancedSignalMonitoring';
import { useSignalOutcomeTracker } from '@/hooks/useSignalOutcomeTracker';
import { usePerformanceNotifications } from '@/hooks/usePerformanceNotifications';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SignalStats from './SignalStats';
import SignalCard from './SignalCard';
import RealTimeStatus from './RealTimeStatus';
import GlobalRefreshIndicator from './GlobalRefreshIndicator';
import SignalDebuggingDashboard from './SignalDebuggingDashboard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Brain, Shield, Zap, Target, TrendingUp, Bug, Star, Award, AlertTriangle, CheckCircle, Bell, BellOff } from 'lucide-react';
import { useMarketActivation } from '@/hooks/useMarketActivation';

// UPDATED: Increased signal limit for better market coverage and diversification
const MAX_ACTIVE_SIGNALS = 20;

const TradingSignals = memo(() => {
  const { signals, loading, lastUpdate, triggerAutomaticSignalGeneration, dailyPerformance } = useTradingSignals();
  const { toast } = useToast();
  
  // Enhanced monitoring systems with comprehensive notifications
  useEnhancedSignalMonitoring();
  useSignalOutcomeTracker();
  usePerformanceNotifications();
  
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [detectingOpportunities, setDetectingOpportunities] = useState(false);
  const [testingSystem, setTestingSystem] = useState(false);
  const [showDebugDashboard, setShowDebugDashboard] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { activateMarket } = useMarketActivation();

  // Signal validation with practical criteria
  const validSignals = signals.filter(signal => {
    if (!signal || typeof signal !== 'object' || !signal.id || !signal.pair || !signal.type) {
      return false;
    }
    // Quality checks (65%+ confidence)
    if (signal.confidence < 65) {
      console.warn(`⚠️ Low confidence signal filtered out: ${signal.pair} (${signal.confidence}%)`);
      return false;
    }
    return true;
  });

  const availablePairs = Array.from(new Set(validSignals.map(signal => signal.pair))).filter(Boolean);
  const [selectedPair, setSelectedPair] = useState('All');

  const filteredSignals = selectedPair === 'All' ? validSignals : validSignals.filter(signal => signal.pair === selectedPair);

  const avgConfidence = validSignals.length > 0 
    ? Math.round(validSignals.reduce((sum, signal) => sum + (signal.confidence || 0), 0) / validSignals.length)
    : 70;

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => {
      const newState = !prev;
      
      toast({
        title: newState ? "🔔 Notifications Enabled" : "🔕 Notifications Disabled",
        description: newState 
          ? "You'll receive alerts for trading events, targets, and performance milestones"
          : "Notifications have been turned off - you can re-enable them anytime",
        duration: 6000,
      });
      
      return newState;
    });
  }, [toast]);

  const handleComprehensiveTest = async () => {
    setTestingSystem(true);
    try {
      console.log('🧪 Running comprehensive system test...');
      const { data, error } = await supabase.functions.invoke('test-signal-generation');
      
      if (error) {
        console.error('❌ Comprehensive test error:', error);
        toast({
          title: "Test Error", 
          description: "Comprehensive test failed. Check logs for details.",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Comprehensive test result:', data);
      
      const testResults = data.tests || {};
      let message = `OpenAI: ${testResults.openAI || 'unknown'}, Market Data: ${testResults.marketData || 0}, Signals: ${testResults.signalsAfterGeneration || 0}`;
      
      toast({
        title: "✅ Comprehensive Test Complete",
        description: message,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Error running comprehensive test:', error);
      toast({
        title: "Test Error",
        description: "Failed to run comprehensive test. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTestingSystem(false);
    }
  };

  const handleDetectOpportunities = async () => {
    setDetectingOpportunities(true);
    try {
      await triggerAutomaticSignalGeneration();
    } catch (error) {
      console.error('Error detecting practical opportunities:', error);
      toast({
        title: "Practical Detection Error",
        description: "Failed to detect new practical opportunities. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDetectingOpportunities(false);
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
          description: "Failed to get additional AI analysis. Please try again.",
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
          description: "Additional AI analysis has been generated for this signal.",
        });
      }
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to get additional AI analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzingSignal(null);
    }
  };

  if (loading && validSignals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading practical signals (analyzing all currency pairs, limit: {MAX_ACTIVE_SIGNALS})...</div>
      </div>
    );
  }

  const hasSignalData = validSignals.length > 0;

  return (
    <div className="space-y-6">
      {/* Global Refresh Status */}
      <GlobalRefreshIndicator />

      {/* Real-time Connection Status */}
      <RealTimeStatus />

      {/* Enhanced Signal Statistics with Daily Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SignalStats 
          signalsCount={validSignals.length}
          avgConfidence={avgConfidence}
          lastUpdate={lastUpdate || 'Never'}
        />
        
        {/* Daily Performance Card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <span>Today's Performance</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNotifications}
              className={`${notificationsEnabled ? 'text-emerald-400' : 'text-gray-400'} hover:text-white`}
            >
              {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Completed</div>
              <div className="text-white text-xl font-bold">{dailyPerformance?.completedSignals || 0}</div>
            </div>
            <div>
              <div className="text-gray-400">Win Rate</div>
              <div className={`text-xl font-bold ${(dailyPerformance?.winRate || 0) >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {dailyPerformance?.winRate || 0}%
              </div>
            </div>
            <div>
              <div className="text-gray-400">Total Pips</div>
              <div className={`text-xl font-bold ${(dailyPerformance?.totalPips || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(dailyPerformance?.totalPips || 0) >= 0 ? '+' : ''}{dailyPerformance?.totalPips || 0}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Active Signals</div>
              <div className="text-blue-400 text-xl font-bold">{validSignals.length}/{MAX_ACTIVE_SIGNALS}</div>
            </div>
          </div>
          
          {notificationsEnabled && (
            <div className="mt-4 text-xs text-gray-400 flex items-center space-x-1">
              <Bell className="h-3 w-3" />
              <span>Live notifications enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Debug Dashboard */}
      {showDebugDashboard && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <SignalDebuggingDashboard />
        </div>
      )}

      {/* Enhanced Pair Filter */}
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
                <option value="All" className="bg-gray-800 text-white">All Pairs ({validSignals.length}/{MAX_ACTIVE_SIGNALS})</option>
                {availablePairs.map(pair => (
                  <option key={pair} value={pair} className="bg-gray-800 text-white">
                    {pair} ({validSignals.filter(s => s.pair === pair).length})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400 flex items-center space-x-2">
              <span>⭐ Quality signals • Live notifications • Enhanced monitoring</span>
              {notificationsEnabled && <Bell className="h-4 w-4 text-emerald-400" />}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Active Signals Grid */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">
          {selectedPair === 'All' ? `Quality Signals (${filteredSignals.length}/${MAX_ACTIVE_SIGNALS})` : `${selectedPair} Signals (${filteredSignals.length})`}
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
                  onGetAIAnalysis={() => handleGetAIAnalysis(signal.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {selectedPair === 'All' 
                ? `No practical signals generated yet (0/${MAX_ACTIVE_SIGNALS})` 
                : `No signals for ${selectedPair}`}
            </div>
            <div className="text-sm text-gray-500 mb-6">
              ⭐ Signal limit: {MAX_ACTIVE_SIGNALS} • Quality focus • 65%+ confidence • Live notifications
            </div>
            <div className="space-x-4">
              <Button
                onClick={handleDetectOpportunities}
                disabled={detectingOpportunities}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {detectingOpportunities ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Opportunities...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Generate Quality Signals
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
