
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
        
        // Get current market prices for chart data
        const symbols = activeSignals
          .filter(signal => signal && signal.symbol && typeof signal.symbol === 'string')
          .map(signal => signal.symbol);
          
        const { data: marketData } = await supabase
          .from('live_market_data')
          .select('*')
          .in('symbol', symbols)
          .order('created_at', { ascending: false });

        const transformedSignals = activeSignals
          .filter(signal => {
            // Strict validation to prevent null errors
            if (!signal || typeof signal !== 'object') {
              console.warn('Invalid signal object:', signal);
              return false;
            }
            
            if (!signal.id || typeof signal.id !== 'string') {
              console.warn('Invalid signal ID:', signal);
              return false;
            }
            
            if (!signal.symbol || typeof signal.symbol !== 'string') {
              console.warn('Invalid signal symbol:', signal);
              return false;
            }
            
            if (!signal.type || typeof signal.type !== 'string') {
              console.warn('Invalid signal type:', signal);
              return false;
            }
            
            if (signal.price === null || signal.price === undefined) {
              console.warn('Invalid signal price:', signal);
              return false;
            }
            
            return true;
          })
          .map(signal => {
            try {
              // Get recent market data for this symbol for chart
              const symbolMarketData = marketData?.filter(md => 
                md && md.symbol === signal.symbol
              ).slice(0, 24) || [];
              
              const currentMarketPrice = symbolMarketData[0]?.price;
              const entryPrice = currentMarketPrice ? 
                parseFloat(currentMarketPrice.toString()).toFixed(5) : 
                parseFloat((signal.price || 0).toString()).toFixed(5);

              const chartData = symbolMarketData.length > 0 ? 
                symbolMarketData.reverse().map((md, i) => ({
                  time: i,
                  price: parseFloat((md.price || 0).toString())
                })) :
                Array.from({ length: 24 }, (_, i) => ({
                  time: i,
                  price: parseFloat((signal.price || 0).toString()) + (Math.sin(i / 4) * 0.0001)
                }));

              return {
                id: signal.id,
                pair: signal.symbol || 'Unknown',
                type: signal.type || 'BUY',
                entryPrice: entryPrice,
                stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
                takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
                takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
                takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
                confidence: Math.floor(signal.confidence || 75),
                timestamp: signal.created_at || signal.timestamp || new Date().toISOString(),
                status: signal.status || 'active',
                analysisText: signal.analysis_text || signal.ai_analysis?.[0]?.analysis_text || 'Technical analysis indicates favorable market conditions',
                chartData: chartData
              };
            } catch (transformError) {
              console.error('Error transforming signal:', transformError, signal);
              return null;
            }
          })
          .filter(signal => signal !== null) as TradingSignal[];

        setSignals(transformedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
        if (transformedSignals.length > 0) {
          toast({
            title: "Signals Updated",
            description: `Loaded ${transformedSignals.length} high-confidence trading signals`,
          });
        }
      } else {
        console.log('No active signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trading signals. Please refresh the page.",
        variant: "destructive"
      });
      setSignals([]);
    } finally {
      setLoading(false);
    }
  };

  // Automatic signal generation trigger with better error handling
  const triggerAutomaticSignalGeneration = async () => {
    try {
      console.log('Triggering automatic signal generation...');
      
      // First ensure we have fresh market data with better error handling
      try {
        const { error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
        if (marketDataError) {
          console.warn('Market data fetch had issues:', marketDataError);
          // Continue with signal generation even if market data fetch fails
        }
      } catch (marketError) {
        console.warn('Market data fetch failed, continuing with signal generation:', marketError);
      }
      
      // Then trigger signal generation
      const { data, error } = await supabase.functions.invoke('generate-signals');
      
      if (error) {
        console.error('Error in automatic signal generation:', error);
        toast({
          title: "Signal Generation",
          description: "Unable to generate new signals at this time",
          variant: "destructive"
        });
        return;
      }

      if (data?.signals && data.signals.length > 0) {
        console.log(`Generated ${data.signals.length} new high-confidence signals`);
        toast({
          title: "New Signals Generated!",
          description: `${data.signals.length} high-confidence opportunities detected`,
        });
        
        // Refresh signals after generation
        setTimeout(fetchSignals, 2000);
      } else {
        console.log('No new high-confidence signals generated');
      }
      
    } catch (error) {
      console.error('Error triggering automatic signal generation:', error);
      toast({
        title: "Signal Generation",
        description: "Market scanning temporarily unavailable",
        variant: "destructive"
      });
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

    // Automatic signal generation every 5 minutes during market hours
    const checkMarketHours = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcDay = now.getUTCDay();
      
      const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                          (utcDay === 0 && utcHour >= 22) || 
                          (utcDay === 5 && utcHour < 22);
      
      return isMarketOpen;
    };

    // Auto-refresh and trigger signal generation
    const autoGenerationInterval = setInterval(() => {
      if (checkMarketHours()) {
        triggerAutomaticSignalGeneration();
      } else {
        fetchSignals(); // Just refresh during closed hours
      }
    }, 300000); // Every 5 minutes

    return () => {
      supabase.removeChannel(channel);
      clearInterval(autoGenerationInterval);
    };
  }, []);

  return {
    signals,
    loading,
    lastUpdate,
    fetchSignals,
    triggerAutomaticSignalGeneration
  };
};
