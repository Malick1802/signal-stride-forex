
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

    console.log('Starting market data fetch...');

    // Get all active centralized signals to know which pairs to fetch
    const { data: activeSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('symbol')
      .eq('status', 'active')
      .eq('is_centralized', true);

    if (signalsError) {
      console.error('Error fetching active signals:', signalsError);
    }

    // Use active signal pairs, fallback to major pairs if none
    const activePairs = activeSignals && activeSignals.length > 0 ? 
      Array.from(new Set(activeSignals.map(s => s.symbol).filter(Boolean))) : 
      ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];

    console.log(`Processing ${activePairs.length} currency pairs:`, activePairs);

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
    let realDataCount = 0;

    // Clean old market data first
    console.log('Cleaning old market data...');
    for (const symbol of activePairs) {
      const { error: deleteError } = await supabase
        .from('live_market_data')
        .delete()
        .eq('symbol', symbol)
        .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

      if (deleteError) {
        console.error(`Error cleaning old data for ${symbol}:`, deleteError);
      }
    }

    // Try to fetch real data from FastForex if API key available
    if (fastForexApiKey) {
      try {
        const supportedPairs = activePairs.filter(pair => 
          ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'].includes(pair)
        );
        
        if (supportedPairs.length > 0) {
          const symbolsParam = supportedPairs.join(',');
          const url = `https://api.fastforex.io/fetch-multi?pairs=${symbolsParam}&api_key=${fastForexApiKey}`;
          
          console.log(`Calling FastForex API for ${supportedPairs.length} pairs...`);
          console.log('API URL:', url.replace(fastForexApiKey, 'HIDDEN'));
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          console.log(`FastForex API response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('FastForex API response received:', Object.keys(data));

            if (data.results && Object.keys(data.results).length > 0) {
              console.log(`Processing ${Object.keys(data.results).length} real price updates`);
              
              for (const [symbol, rates] of Object.entries(data.results)) {
                const price = parseFloat((rates as any).c || (rates as any).o || 0);
                if (price > 0) {
                  const spread = price * 0.0001;
                  
                  marketDataBatch.push({
                    symbol,
                    price,
                    bid: parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5)),
                    ask: parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5)),
                    source: 'fastforex_real',
                    timestamp: new Date().toISOString(),
                    created_at: new Date().toISOString()
                  });
                  realDataCount++;
                }
              }

              console.log(`Successfully processed ${realDataCount} real market data records`);
            } else {
              console.log('FastForex API returned empty results');
            }
          } else {
            const errorText = await response.text();
            console.log(`FastForex API error ${response.status}:`, errorText);
          }
        }
      } catch (apiError) {
        console.error('FastForex API request failed:', apiError);
      }
    } else {
      console.log('No FastForex API key found, using simulation only');
    }

    // Generate data for remaining pairs (real or simulated)
    console.log('Generating market data for all pairs...');
    
    for (const pair of activePairs) {
      // Skip if we already have real data for this pair
      if (marketDataBatch.some(item => item.symbol === pair)) {
        continue;
      }

      // Get the latest market data for this pair to maintain continuity
      const { data: lastData } = await supabase
        .from('live_market_data')
        .select('price')
        .eq('symbol', pair)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let baseRate;
      
      if (lastData) {
        // Use the last known price and add realistic movement
        baseRate = parseFloat(lastData.price.toString());
        const marketMovement = isMarketOpen ? 
          (Math.random() - 0.5) * 0.0008 : // More movement during market hours
          (Math.random() - 0.5) * 0.00008; // Minimal movement when closed
        baseRate += marketMovement;
      } else {
        // Generate realistic base rates for new pairs
        if (pair.includes('JPY')) {
          baseRate = 140 + (Math.random() * 20); // USDJPY range 140-160
        } else if (pair.startsWith('EUR')) {
          baseRate = 1.05 + (Math.random() * 0.15); // EURUSD range 1.05-1.20
        } else if (pair.startsWith('GBP')) {
          baseRate = 1.25 + (Math.random() * 0.15); // GBPUSD range 1.25-1.40
        } else if (pair.startsWith('AUD') || pair.startsWith('NZD')) {
          baseRate = 0.65 + (Math.random() * 0.15); // AUDUSD range 0.65-0.80
        } else if (pair.startsWith('USD')) {
          baseRate = 1.0 + (Math.random() * 0.5); // USD pairs
        } else {
          baseRate = 0.8 + (Math.random() * 0.6); // Other pairs
        }
      }
      
      const spread = baseRate * (pair.includes('JPY') ? 0.002 : 0.00015);
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

    console.log(`Generated ${marketDataBatch.length} total market data records (${realDataCount} real, ${marketDataBatch.length - realDataCount} simulated)`);

    // Insert market data into database
    if (marketDataBatch.length > 0) {
      console.log('Inserting market data batch...');
      
      const { data: insertedData, error: insertError } = await supabase
        .from('live_market_data')
        .insert(marketDataBatch)
        .select();

      if (insertError) {
        console.error('Error inserting market data:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert market data', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully inserted ${insertedData?.length || marketDataBatch.length} market data records`);
      
      // Verify the insertion
      const { data: verifyData } = await supabase
        .from('live_market_data')
        .select('symbol, price, source, created_at')
        .in('symbol', activePairs)
        .order('created_at', { ascending: false })
        .limit(activePairs.length);

      if (verifyData && verifyData.length > 0) {
        console.log('Verification - Latest data in database:');
        verifyData.forEach(d => {
          console.log(`${d.symbol}: ${d.price} (${d.source}) at ${d.created_at}`);
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${marketDataBatch.length} currency pairs`,
        pairs: marketDataBatch.map(item => item.symbol),
        realDataCount,
        simulatedDataCount: marketDataBatch.length - realDataCount,
        marketOpen: isMarketOpen,
        fastForexApiUsed: realDataCount > 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-market-data function:', error);
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
