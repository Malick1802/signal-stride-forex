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
    console.log('🌊 FastForex baseline market stream (60s refresh cycle)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !fastForexApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Priority currency pairs for centralized streaming
    const streamingPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY'
    ];

    console.log(`📊 Fetching fresh FastForex data for ${streamingPairs.length} pairs (60s cycle)`);

    // Check market hours
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    if (isMarketClosed) {
      console.log('📴 Market closed - generating minimal weekend movement');
      
      // During market close, make small random adjustments to existing prices
      const { data: existingStates, error: existingError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .limit(streamingPairs.length);
        
      if (!existingError && existingStates?.length > 0) {
        const weekendUpdates = [];
        const timestamp = new Date().toISOString();
        
        for (const state of existingStates) {
          const basePrice = parseFloat(state.current_price.toString());
          const weekendMovement = (Math.random() - 0.5) * basePrice * 0.00003; // Very small 0.003% movement
          const newPrice = parseFloat((basePrice + weekendMovement).toFixed(state.symbol.includes('JPY') ? 3 : 5));
          
          const spread = newPrice * (state.symbol.includes('JPY') ? 0.00005 : 0.00003);
          const bid = parseFloat((newPrice - spread/2).toFixed(state.symbol.includes('JPY') ? 3 : 5));
          const ask = parseFloat((newPrice + spread/2).toFixed(state.symbol.includes('JPY') ? 3 : 5));
          
          weekendUpdates.push({
            symbol: state.symbol,
            current_price: newPrice,
            bid,
            ask,
            last_update: timestamp,
            is_market_open: false,
            source: 'weekend-simulation'
          });
        }
        
        // Update market state
        for (const update of weekendUpdates) {
          await supabase
            .from('centralized_market_state')
            .upsert(update, { onConflict: 'symbol' });
        }
        
        console.log(`✅ Weekend simulation updated ${weekendUpdates.length} pairs`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Weekend market simulation completed',
          isMarketOpen: false,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Market is open - fetch fresh FastForex data
    const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
    const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${currencies.join(',')}&api_key=${fastForexApiKey}`;
    
    console.log(`🔄 Fetching fresh FastForex data: ${fetchMultiUrl.replace(fastForexApiKey, '[API_KEY]')}`);
    
    const response = await fetch(fetchMultiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CentralizedMarketStream/2.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`FastForex API error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.results) {
      throw new Error('Invalid FastForex response format');
    }
    
    const baseRates = { USD: 1, ...data.results };
    
    console.log('💱 Fresh FastForex rates received:', Object.keys(baseRates));

    // Calculate currency pair rates and update baseline state
    const marketUpdates = [];
    const priceHistory = [];
    const timestamp = new Date().toISOString();

    for (const pair of streamingPairs) {
      try {
        const baseCurrency = pair.substring(0, 3);
        const quoteCurrency = pair.substring(3, 6);
        
        if (baseRates[baseCurrency] && baseRates[quoteCurrency]) {
          const rate = baseRates[quoteCurrency] / baseRates[baseCurrency];
          const price = parseFloat(rate.toFixed(pair.includes('JPY') ? 3 : 5));
          
          // Calculate realistic bid/ask spread based on market session
          const session = getMarketSession();
          const baseSpread = price * (pair.includes('JPY') ? 0.00003 : 0.00002);
          const sessionSpread = baseSpread * session.spreadMultiplier;
          
          const bid = parseFloat((price - sessionSpread/2).toFixed(pair.includes('JPY') ? 3 : 5));
          const ask = parseFloat((price + sessionSpread/2).toFixed(pair.includes('JPY') ? 3 : 5));

          // Prepare fresh market state update
          marketUpdates.push({
            symbol: pair,
            current_price: price,
            bid,
            ask,
            last_update: timestamp,
            is_market_open: true,
            source: `fastforex-fresh-${session.name.toLowerCase()}`
          });

          // Prepare fresh price history entry
          priceHistory.push({
            symbol: pair,
            price,
            bid,
            ask,
            timestamp,
            source: `fastforex-fresh-${session.name.toLowerCase()}`
          });
          
          console.log(`📈 ${pair}: ${price} (fresh FastForex, ${session.name} session)`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${pair}:`, error);
      }
    }

    console.log(`💾 Updating fresh market state for ${marketUpdates.length} pairs`);

    // Update centralized market state with fresh FastForex data
    for (const update of marketUpdates) {
      const { error } = await supabase
        .from('centralized_market_state')
        .upsert(update, { onConflict: 'symbol' });
        
      if (error) {
        console.error(`❌ Error updating fresh market state for ${update.symbol}:`, error);
      }
    }

    // Insert fresh price history
    const { error: historyError } = await supabase
      .from('live_price_history')
      .insert(priceHistory);
      
    if (historyError) {
      console.error('❌ Error inserting fresh price history:', historyError);
    }

    // Efficient cleanup: keep only last 200 points per pair
    for (const pair of streamingPairs) {
      const { data: oldRecords } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', pair)
        .order('timestamp', { ascending: false })
        .range(200, 1000);
        
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        await supabase
          .from('live_price_history')
          .delete()
          .in('id', idsToDelete);
      }
    }

    console.log('✅ Fresh FastForex market stream update completed (60s cycle)');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fresh FastForex data updated for ${marketUpdates.length} pairs`,
        pairs: marketUpdates.map(u => u.symbol),
        timestamp,
        source: 'fastforex-fresh-60s',
        isMarketOpen: true,
        session: getMarketSession().name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 FastForex market stream error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        source: 'fastforex-error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get current market session
function getMarketSession() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 22 || utcHour < 8) {
    return { name: 'Asian', spreadMultiplier: 1.2 };
  } else if (utcHour >= 8 && utcHour < 16) {
    return { name: 'European', spreadMultiplier: 1.0 };
  } else if (utcHour >= 13 && utcHour < 17) {
    return { name: 'US-EU-Overlap', spreadMultiplier: 0.8 };
  } else {
    return { name: 'US', spreadMultiplier: 0.9 };
  }
}
