
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting centralized market data fetch...');

    // Get all active centralized signals to know which pairs to fetch
    const { data: activeSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('symbol')
      .eq('status', 'active')
      .eq('is_centralized', true);

    if (signalsError) {
      console.error('Error fetching active signals:', signalsError);
    }

    // Extract unique symbols from active signals
    const activePairs = activeSignals ? 
      Array.from(new Set(activeSignals.map(s => s.symbol).filter(Boolean))) : 
      ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD']; // Fallback pairs

    console.log(`Fetching market data for ${activePairs.length} active signal pairs:`, activePairs);

    // Check market hours
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    let isMarketOpen = false;
    if (utcDay === 0) {
      isMarketOpen = utcHour >= 22;
    } else if (utcDay >= 1 && utcDay <= 4) {
      isMarketOpen = true;
    } else if (utcDay === 5) {
      isMarketOpen = utcHour < 22;
    }

    console.log(`Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`);

    let marketDataBatch = [];

    // Try to fetch real data from FastForex
    if (fastForexApiKey && activePairs.length > 0) {
      try {
        const symbolsParam = activePairs.join(',');
        const url = `https://api.fastforex.io/fetch-multi?pairs=${symbolsParam}&api_key=${fastForexApiKey}`;
        
        console.log('Fetching real market data from FastForex API...');
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log('FastForex API response received successfully');

          if (data.results && Object.keys(data.results).length > 0) {
            marketDataBatch = Object.entries(data.results).map(([symbol, rates]: [string, any]) => {
              const price = parseFloat(rates.c || rates.o || 0);
              const spread = price * 0.0001;
              
              return {
                symbol,
                price,
                bid: parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5)),
                ask: parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5)),
                source: 'fastforex_centralized',
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString()
              };
            });

            console.log(`Successfully processed ${marketDataBatch.length} real centralized market data records`);
          }
        } else {
          console.log(`FastForex API returned ${response.status}: ${response.statusText}`);
          throw new Error(`FastForex API error: ${response.status}`);
        }
      } catch (apiError) {
        console.error('FastForex API failed:', apiError);
        console.log('Falling back to centralized realistic simulation');
      }
    } else {
      console.log('No FastForex API key or active pairs found, using centralized simulation');
    }

    // Generate centralized realistic market data if no real data
    if (marketDataBatch.length === 0) {
      console.log('Generating centralized realistic market data for active signal pairs');
      
      // Get the latest market data for each pair to maintain continuity
      for (const pair of activePairs) {
        const { data: lastData } = await supabase
          .from('live_market_data')
          .select('price')
          .eq('symbol', pair)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let baseRate;
        
        if (lastData) {
          // Use the last known price and add small realistic movement
          baseRate = parseFloat(lastData.price.toString());
          const marketMovement = isMarketOpen ? 
            (Math.random() - 0.5) * 0.0002 : // Normal movement during market hours
            (Math.random() - 0.5) * 0.00005; // Minimal movement when closed
          baseRate += marketMovement;
        } else {
          // Generate realistic base rates for new pairs
          if (pair.includes('JPY')) {
            baseRate = 110 + (Math.random() * 50);
          } else if (pair.startsWith('EUR')) {
            baseRate = 0.9 + (Math.random() * 0.4);
          } else if (pair.startsWith('GBP')) {
            baseRate = 1.15 + (Math.random() * 0.25);
          } else if (pair.startsWith('AUD') || pair.startsWith('NZD')) {
            baseRate = 0.65 + (Math.random() * 0.15);
          } else if (pair.startsWith('USD')) {
            baseRate = 0.8 + (Math.random() * 0.6);
          } else {
            baseRate = 0.7 + (Math.random() * 0.8);
          }
        }
        
        const spread = baseRate * 0.0001;
        const price = parseFloat(baseRate.toFixed(pair.includes('JPY') ? 3 : 5));
        const bid = parseFloat((price - spread/2).toFixed(pair.includes('JPY') ? 3 : 5));
        const ask = parseFloat((price + spread/2).toFixed(pair.includes('JPY') ? 3 : 5));

        marketDataBatch.push({
          symbol: pair,
          price,
          bid,
          ask,
          source: 'centralized_simulation',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }

      console.log(`Generated ${marketDataBatch.length} centralized market data records`);
    }

    // Insert centralized market data into database
    if (marketDataBatch.length > 0) {
      const { error: insertError } = await supabase
        .from('live_market_data')
        .insert(marketDataBatch);

      if (insertError) {
        console.error('Error inserting centralized market data:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert centralized market data', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully inserted ${marketDataBatch.length} centralized market data records`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fetched ${marketDataBatch.length} centralized currency pairs successfully`,
        pairs: marketDataBatch.map(item => item.symbol),
        source: marketDataBatch[0]?.source || 'centralized_simulation',
        marketOpen: isMarketOpen,
        timestamp: new Date().toISOString(),
        centralized: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in centralized fetch-market-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
