
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Target, Shield, Brain, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TradingSignals = () => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingSignal, setAnalyzingSignal] = useState(null);
  const [analysis, setAnalysis] = useState({});
  const { toast } = useToast();

  // Fetch centralized signals from database
  const fetchSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_signals')
        .select(`
          *,
          ai_analysis (
            analysis_text,
            confidence_score,
            market_conditions
          )
        `)
        .eq('is_centralized', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching signals:', error);
        return;
      }

      if (data) {
        // Transform data to match the expected format
        const transformedSignals = data.map(signal => ({
          id: signal.id,
          pair: signal.symbol,
          type: signal.type,
          entryPrice: parseFloat(signal.price).toFixed(5),
          stopLoss: parseFloat(signal.stop_loss).toFixed(5),
          takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0]).toFixed(5) : '0.00000',
          takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1]).toFixed(5) : '0.00000',
          takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2]).toFixed(5) : '0.00000',
          confidence: Math.floor(signal.confidence),
          timestamp: signal.created_at,
          status: signal.status,
          analysisText: signal.analysis_text,
          aiAnalysis: signal.ai_analysis?.[0] || null,
          // Generate mock chart data for now
          chartData: Array.from({ length: 24 }, (_, i) => ({
            time: i,
            price: Math.random() * 0.02 + parseFloat(signal.price) + (Math.sin(i / 4) * 0.01)
          }))
        }));

        setSignals(transformedSignals);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trading signals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate new signals
  const generateSignals = async () => {
    try {
      setLoading(true);
      
      // First fetch market data
      const marketResponse = await supabase.functions.invoke('fetch-market-data');
      
      if (marketResponse.error) {
        throw new Error('Failed to fetch market data');
      }

      // Then generate signals
      const signalResponse = await supabase.functions.invoke('generate-signals');
      
      if (signalResponse.error) {
        throw new Error('Failed to generate signals');
      }

      toast({
        title: "Success",
        description: "New signals generated successfully",
      });

      // Refresh the signals list
      await fetchSignals();
    } catch (error) {
      console.error('Error generating signals:', error);
      toast({
        title: "Error",
        description: "Failed to generate new signals",
        variant: "destructive"
      });
    }
  };

  // Get AI analysis for a specific signal
  const getAIAnalysis = async (signalId) => {
    try {
      setAnalyzingSignal(signalId);
      
      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: { signalId }
      });

      if (error) {
        throw new Error('Failed to get AI analysis');
      }

      if (data?.analysis) {
        setAnalysis(prev => ({
          ...prev,
          [signalId]: data.analysis
        }));
        
        toast({
          title: "AI Analysis Complete",
          description: "Detailed analysis has been generated",
        });
      }
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI analysis",
        variant: "destructive"
      });
    } finally {
      setAnalyzingSignal(null);
    }
  };

  useEffect(() => {
    fetchSignals();
    
    // Set up real-time subscription for new signals
    const channel = supabase
      .channel('trading-signals-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        () => {
          fetchSignals();
        }
      )
      .subscribe();

    // Auto-refresh signals every 30 seconds
    const interval = setInterval(fetchSignals, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">{signals.length}</div>
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
            onClick={generateSignals}
            disabled={loading}
            className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Generate New</span>
          </button>
        </div>
      </div>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {signals.map(signal => (
          <div key={signal.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
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
                    onClick={() => getAIAnalysis(signal.id)}
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
        ))}
      </div>

      {signals.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No active signals available</div>
          <button
            onClick={generateSignals}
            className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
          >
            Generate Signals
          </button>
        </div>
      )}
    </div>
  );
};

export default TradingSignals;
