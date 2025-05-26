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
    console.log('🌊 Starting centralized market stream service...');
    
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

    console.log(`📊 Fetching baseline data for ${streamingPairs.length} pairs`);

    // Fetch latest rates from FastForex (baseline data)
    const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];
    const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${currencies.join(',')}&api_key=${fastForexApiKey}`;
    
    const response = await fetch(fetchMultiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CentralizedMarketStream/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`FastForex API error: ${response.status}`);
    }
    
    const data = await response.json();
    const baseRates = { USD: 1, ...data.results };
    
    console.log('💱 Baseline rates received:', Object.keys(baseRates));

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
          
          // Calculate realistic bid/ask spread
          const spread = price * (pair.includes('JPY') ? 0.00003 : 0.00002);
          const bid = parseFloat((price - spread/2).toFixed(pair.includes('JPY') ? 3 : 5));
          const ask = parseFloat((price + spread/2).toFixed(pair.includes('JPY') ? 3 : 5));

          // Prepare baseline market state update
          marketUpdates.push({
            symbol: pair,
            current_price: price,
            bid,
            ask,
            last_update: timestamp,
            is_market_open: true,
            source: 'fastforex-baseline'
          });

          // Prepare baseline price history entry
          priceHistory.push({
            symbol: pair,
            price,
            bid,
            ask,
            timestamp,
            source: 'fastforex-baseline'
          });
          
          console.log(`📈 ${pair}: ${price} (baseline from FastForex)`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${pair}:`, error);
      }
    }

    console.log(`💾 Updating baseline market state for ${marketUpdates.length} pairs`);

    // Update centralized market state (baseline)
    for (const update of marketUpdates) {
      const { error } = await supabase
        .from('centralized_market_state')
        .upsert(update, { onConflict: 'symbol' });
        
      if (error) {
        console.error(`❌ Error updating baseline market state for ${update.symbol}:`, error);
      }
    }

    // Insert baseline price history
    const { error: historyError } = await supabase
      .from('live_price_history')
      .insert(priceHistory);
      
    if (historyError) {
      console.error('❌ Error inserting baseline price history:', historyError);
    }

    // Clean up old price history (keep last 200 points per pair)
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

    console.log('✅ Baseline market stream update completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated baseline market data for ${marketUpdates.length} pairs`,
        pairs: marketUpdates.map(u => u.symbol),
        timestamp,
        source: 'fastforex-baseline'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Centralized market stream error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
