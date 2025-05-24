
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
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = async () => {
    try {
      console.log('Fetching trading signals...');
      
      const { data: activeSignals, error } = await supabase
        .from('trading_signals')
        .select(`
          *,
          ai_analysis (
            analysis_text,
            confidence_score
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching signals:', error);
        toast({
          title: "Database Error",
          description: "Failed to fetch trading signals",
          variant: "destructive"
        });
        return;
      }

      if (activeSignals && activeSignals.length > 0) {
        console.log(`Found ${activeSignals.length} active signals`);
        
        const transformedSignals = activeSignals.map(signal => ({
          id: signal.id,
          pair: signal.symbol || 'Unknown',
          type: signal.type || 'BUY',
          entryPrice: signal.price ? parseFloat(signal.price.toString()).toFixed(5) : '0.00000',
          stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
          takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
          takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
          takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
          confidence: Math.floor(signal.confidence || 0),
          timestamp: signal.created_at || signal.timestamp,
          status: signal.status || 'active',
          analysisText: signal.analysis_text || signal.ai_analysis?.[0]?.analysis_text,
          chartData: Array.from({ length: 24 }, (_, i) => ({
            time: i,
            price: Math.random() * 0.02 + parseFloat(signal.price ? signal.price.toString() : '1') + (Math.sin(i / 4) * 0.01)
          }))
        }));

        setSignals(transformedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
        toast({
          title: "Signals Updated",
          description: `Loaded ${transformedSignals.length} active trading signals`,
        });
      } else {
        console.log('No active signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
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

  useEffect(() => {
    fetchSignals();
    
    // Set up real-time subscription for signals
    const channel = supabase
      .channel('trading-signals-updates')
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

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchSignals, 120000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return {
    signals,
    loading,
    lastUpdate,
    fetchSignals
  };
};
