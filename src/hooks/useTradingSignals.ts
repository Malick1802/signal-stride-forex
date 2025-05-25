
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
  isCentralized: boolean;
}

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { toast } = useToast();

  const fetchSignals = async () => {
    try {
      console.log('Fetching centralized trading signals...');
      
      // Fetch only centralized signals for professional display
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
        .eq('is_centralized', true) // Only centralized signals
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
        console.log(`Found ${activeSignals.length} centralized signals`);
        
        // Get current market prices for chart data
        const symbols = activeSignals.map(signal => signal.symbol);
        const { data: marketData } = await supabase
          .from('live_market_data')
          .select('*')
          .in('symbol', symbols)
          .order('created_at', { ascending: false });

        const transformedSignals = activeSignals.map(signal => {
          // Get recent market data for this symbol for chart
          const symbolMarketData = marketData?.filter(md => md.symbol === signal.symbol)
            .slice(0, 30) || []; // Get more data points for better charts
          
          // Use real market price as entry price if available
          const currentMarketPrice = symbolMarketData[0]?.price;
          const entryPrice = currentMarketPrice ? 
            parseFloat(currentMarketPrice.toString()).toFixed(5) : 
            parseFloat(signal.price.toString()).toFixed(5);

          // Generate chart data from real market data
          const chartData = symbolMarketData.length > 0 ? 
            symbolMarketData.reverse().map((md, i) => ({
              time: i,
              price: parseFloat(md.price.toString())
            })) :
            // Fallback to signal price with minimal movement
            Array.from({ length: 30 }, (_, i) => ({
              time: i,
              price: parseFloat(signal.price.toString())
            }));

          return {
            id: signal.id,
            pair: signal.symbol || 'Unknown',
            type: signal.type || 'BUY',
            entryPrice: parseFloat(signal.price.toString()).toFixed(5),
            stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
            takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
            takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
            takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
            confidence: Math.floor(signal.confidence || 0),
            timestamp: signal.created_at || signal.timestamp,
            status: signal.status || 'active',
            analysisText: signal.analysis_text || signal.ai_analysis?.[0]?.analysis_text,
            chartData: chartData,
            isCentralized: signal.is_centralized || false
          };
        });

        setSignals(transformedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
        toast({
          title: "Centralized Signals Updated",
          description: `Loaded ${transformedSignals.length} professional trading signals with real market data`,
        });
      } else {
        console.log('No centralized signals found');
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
    
    // Set up real-time subscription for centralized signals
    const channel = supabase
      .channel('centralized-signals-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log('Real-time centralized signal update:', payload);
          fetchSignals();
        }
      )
      .subscribe();

    // Auto-refresh every 60 seconds for fresh market data
    const interval = setInterval(fetchSignals, 60000);

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
