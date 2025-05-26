
import { useState, useEffect, useCallback } from 'react';
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

  // Check market hours function
  const checkMarketHours = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    return (utcDay >= 1 && utcDay <= 5) && 
           (utcDay !== 5 || utcHour < 22) && 
           (utcDay !== 1 || utcHour >= 22);
  };

  // Enhanced market data fetching with better timing
  const ensureMarketDataAvailable = async (symbols: string[], maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Checking for market data, attempt ${attempt}/${maxRetries}`);
      
      // Check for market data in last 30 minutes (more generous window)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: existingData } = await supabase
        .from('live_market_data')
        .select('symbol, price, created_at')
        .in('symbol', symbols)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false });

      const availableSymbols = new Set(existingData?.map(d => d.symbol) || []);
      const missingSymbols = symbols.filter(s => !availableSymbols.has(s));
      
      console.log(`Found data for ${availableSymbols.size}/${symbols.length} symbols`);
      
      if (missingSymbols.length === 0) {
        console.log('All required market data is available');
        return existingData;
      }
      
      if (attempt === 1) {
        console.log(`Missing data for symbols: ${missingSymbols.join(', ')}, fetching fresh data`);
        
        try {
          const { error: fetchError } = await supabase.functions.invoke('fetch-market-data');
          if (fetchError) {
            console.error('Market data fetch error:', fetchError);
          } else {
            console.log('Market data fetch initiated successfully');
          }
        } catch (error) {
          console.error('Failed to trigger market data fetch:', error);
        }
      }
      
      // Wait longer for data to be processed and committed
      const delay = attempt === 1 ? 5000 : attempt * 3000;
      console.log(`Waiting ${delay}ms for data processing...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Final check with even more generous time window
    const { data: finalData } = await supabase
      .from('live_market_data')
      .select('symbol, price, created_at')
      .in('symbol', symbols)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false });
      
    console.log(`Final check: found ${finalData?.length || 0} market data records`);
    return finalData || [];
  };

  const fetchSignals = useCallback(async () => {
    try {
      console.log('Fetching trading signals...');
      
      const { data: activeSignals, error } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching signals:', error);
        return;
      }

      if (activeSignals && activeSignals.length > 0) {
        console.log(`Found ${activeSignals.length} active signals`);
        
        // Get symbols from signals
        const symbols = activeSignals
          .filter(signal => signal?.symbol)
          .map(signal => signal.symbol);
          
        console.log('Ensuring market data availability for symbols:', symbols);
        
        // Wait for real market data
        const marketData = await ensureMarketDataAvailable(symbols);
        
        if (!marketData || marketData.length === 0) {
          console.warn('No market data available - waiting for next update cycle');
          // Don't show signals without real market data
          setSignals([]);
          setLastUpdate(new Date().toLocaleTimeString());
          return;
        }

        console.log(`Processing signals with ${marketData.length} market data points`);

        // Group market data by symbol for quick lookup
        const marketDataBySymbol = marketData.reduce((acc, item) => {
          if (!acc[item.symbol]) acc[item.symbol] = [];
          acc[item.symbol].push(item);
          return acc;
        }, {} as Record<string, any[]>);

        const transformedSignals = activeSignals
          .filter(signal => signal?.id && signal?.symbol && signal?.type && signal?.price !== null)
          .map(signal => {
            try {
              console.log(`Processing signal for ${signal.symbol}...`);
              
              // Get the most recent market data for this symbol
              const symbolMarketData = marketDataBySymbol[signal.symbol];
              
              if (!symbolMarketData || symbolMarketData.length === 0) {
                console.warn(`No market data found for ${signal.symbol} - skipping this signal`);
                return null; // Skip signals without real market data
              }

              // Sort by created_at to get the most recent
              symbolMarketData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              const latestMarketData = symbolMarketData[0];
              const currentMarketPrice = parseFloat(latestMarketData.price.toString());
              
              console.log(`Using real market data for ${signal.symbol}: ${currentMarketPrice}`);
              
              // Create realistic chart data from recent market data
              const chartData = symbolMarketData.slice(0, 30).reverse().map((md, i) => ({
                time: i,
                price: parseFloat(md.price.toString())
              }));

              const entryPrice = currentMarketPrice.toFixed(5);

              return {
                id: signal.id,
                pair: signal.symbol,
                type: signal.type,
                entryPrice: entryPrice,
                stopLoss: signal.stop_loss ? parseFloat(signal.stop_loss.toString()).toFixed(5) : '0.00000',
                takeProfit1: signal.take_profits?.[0] ? parseFloat(signal.take_profits[0].toString()).toFixed(5) : '0.00000',
                takeProfit2: signal.take_profits?.[1] ? parseFloat(signal.take_profits[1].toString()).toFixed(5) : '0.00000',
                takeProfit3: signal.take_profits?.[2] ? parseFloat(signal.take_profits[2].toString()).toFixed(5) : '0.00000',
                confidence: Math.floor(signal.confidence || 85),
                timestamp: signal.created_at || new Date().toISOString(),
                status: signal.status || 'active',
                analysisText: signal.analysis_text || 'High-confidence trading opportunity detected with real-time market data',
                chartData: chartData
              };
            } catch (error) {
              console.error('Error transforming signal:', error);
              return null;
            }
          })
          .filter(Boolean) as TradingSignal[];

        console.log(`Successfully processed ${transformedSignals.length} signals with real market data`);
        setSignals(transformedSignals);
        setLastUpdate(new Date().toLocaleTimeString());
        
        if (transformedSignals.length > 0) {
          toast({
            title: "Real-Time Data Loaded",
            description: `${transformedSignals.length} signals updated with live market prices`,
          });
        }
        
      } else {
        console.log('No active signals found');
        setSignals([]);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const triggerAutomaticSignalGeneration = useCallback(async () => {
    try {
      console.log('Triggering comprehensive market update...');
      
      // First ensure we have fresh market data
      console.log('Ensuring fresh market data...');
      const { error: marketDataError } = await supabase.functions.invoke('fetch-market-data');
      if (marketDataError) {
        console.error('Market data update failed:', marketDataError);
        return;
      }
      
      // Wait longer for market data to be processed
      console.log('Waiting for market data to be processed...');
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      console.log('Triggering signal generation...');
      const { data, error } = await supabase.functions.invoke('generate-signals');
      
      if (error) {
        console.error('Signal generation error:', error);
        return;
      }

      if (data?.signals && data.signals.length > 0) {
        console.log(`Generated ${data.signals.length} new signals`);
        toast({
          title: "New Signals Generated!",
          description: `${data.signals.length} high-confidence opportunities detected`,
        });
        
        // Refresh signals after generation with longer delay
        setTimeout(fetchSignals, 8000);
      } else {
        console.log('No new signals generated this cycle');
      }
      
    } catch (error) {
      console.error('Error in signal generation:', error);
    }
  }, [fetchSignals, toast]);

  useEffect(() => {
    fetchSignals();
    
    // Set up real-time subscription for signals
    const signalsChannel = supabase
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
          setTimeout(fetchSignals, 3000);
        }
      )
      .subscribe();

    // Set up real-time subscription for market data
    const marketChannel = supabase
      .channel('market-data-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_market_data'
        },
        (payload) => {
          console.log('Real-time market data update:', payload);
          setTimeout(fetchSignals, 2000);
        }
      )
      .subscribe();

    // Market data updates with better timing
    const marketOpen = checkMarketHours();
    const marketDataInterval = setInterval(async () => {
      try {
        const isMarketOpen = checkMarketHours();
        console.log(`Triggering scheduled market data update (Market ${isMarketOpen ? 'OPEN' : 'CLOSED'})`);
        
        const { error } = await supabase.functions.invoke('fetch-market-data');
        if (error) {
          console.error('Scheduled market data update error:', error);
        } else {
          console.log('Scheduled market data update successful');
          // Refresh signals after market data update with longer delay
          setTimeout(fetchSignals, 5000);
        }
      } catch (error) {
        console.error('Scheduled market data update failed:', error);
      }
    }, marketOpen ? 30000 : 60000); // 30 seconds during market hours, 60 seconds when closed

    // Signal generation every 5 minutes (only during market hours)
    const signalGenerationInterval = setInterval(() => {
      const isMarketOpen = checkMarketHours();
      if (isMarketOpen) {
        const delay = Math.random() * 5000; // 0-5 seconds random delay
        setTimeout(triggerAutomaticSignalGeneration, delay);
      } else {
        console.log('Market closed - skipping signal generation');
      }
    }, 300000);

    return () => {
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(marketChannel);
      clearInterval(marketDataInterval);
      clearInterval(signalGenerationInterval);
    };
  }, [fetchSignals, triggerAutomaticSignalGeneration]);

  return {
    signals,
    loading,
    lastUpdate,
    fetchSignals,
    triggerAutomaticSignalGeneration
  };
};
