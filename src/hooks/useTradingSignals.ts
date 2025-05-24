
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TradingSignal {
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
  status: string;
  analysisText?: string;
  chartData: Array<{ time: number; price: number }>;
}

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingSignal, setAnalyzingSignal] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerationError, setLastGenerationError] = useState<any>(null);
  const { toast } = useToast();

  const fetchSignals = async () => {
    try {
      console.log('Fetching trading signals...');
      
      // Debug query to check table contents
      const { data: allSignals, error: debugError } = await supabase
        .from('trading_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('Debug - All signals in table:', { allSignals, debugError });

      // Main query for active signals
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      console.log('Main query result:', { data, error });

      if (error) {
        console.error('Error fetching signals:', error);
        toast({
          title: "Error",
          description: "Failed to fetch trading signals",
          variant: "destructive"
        });
        return;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} signals`);
        
        const transformedSignals = data.map(signal => ({
          id: signal.id,
          pair: signal.symbol,
          type: signal.type,
          entryPrice: signal.price ? parseFloat(signal.price.toString()).toFixed(5) : '0.00000',
          stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
          takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
          takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
          takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
          confidence: Math.floor(signal.confidence || 0),
          timestamp: signal.created_at,
          status: signal.status,
          analysisText: signal.analysis_text,
          chartData: Array.from({ length: 24 }, (_, i) => ({
            time: i,
            price: Math.random() * 0.02 + parseFloat(signal.price ? signal.price.toString() : '1') + (Math.sin(i / 4) * 0.01)
          }))
        }));

        console.log('Transformed signals:', transformedSignals);
        setSignals(transformedSignals);
      } else {
        console.log('No signals found');
        setSignals([]);
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

  const generateSignals = async () => {
    try {
      setIsGenerating(true);
      setLastGenerationError(null);
      
      console.log('Starting signal generation process...');
      
      const marketResponse = await supabase.functions.invoke('fetch-market-data');
      
      if (marketResponse.error) {
        throw new Error(`Market data fetch failed: ${marketResponse.error.message}`);
      }

      console.log('Market data fetched successfully, now generating signals...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const signalResponse = await supabase.functions.invoke('generate-signals');
      
      if (signalResponse.error) {
        console.error('Signal generation error:', signalResponse.error);
        throw new Error(`Signal generation failed: ${signalResponse.error.message}`);
      }

      if (signalResponse.data?.error) {
        console.error('Signal generation function error:', signalResponse.data);
        setLastGenerationError(signalResponse.data);
        throw new Error(signalResponse.data.error);
      }

      toast({
        title: "Success",
        description: signalResponse.data?.message || "New signals generated successfully",
      });

      await fetchSignals();
    } catch (error: any) {
      console.error('Error generating signals:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate new signals",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getAIAnalysis = async (signalId: string) => {
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
    
    const channel = supabase
      .channel('trading-signals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals'
        },
        (payload) => {
          console.log('Real-time signal update:', payload);
          fetchSignals();
        }
      )
      .subscribe();

    const interval = setInterval(fetchSignals, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return {
    signals,
    loading,
    analyzingSignal,
    analysis,
    isGenerating,
    lastGenerationError,
    fetchSignals,
    generateSignals,
    getAIAnalysis
  };
};
