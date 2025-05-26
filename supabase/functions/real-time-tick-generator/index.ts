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
    console.log('🔥 Starting real-time tick generator...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current baseline prices from centralized market state
    const { data: marketStates, error: stateError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false });

    if (stateError) {
      console.error('❌ Error fetching market states:', stateError);
      throw stateError;
    }

    if (!marketStates || marketStates.length === 0) {
      console.log('⚠️ No baseline market data found, triggering market stream first...');
      
      // Trigger the centralized market stream to get baseline data
      const { error: streamError } = await supabase.functions.invoke('centralized-market-stream');
      if (streamError) {
        console.error('❌ Error triggering market stream:', streamError);
      }
      
      return new Response(
        JSON.stringify({ 
          message: 'No baseline data, triggered market stream update',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Generating ticks for ${marketStates.length} pairs`);

    const tickUpdates = [];
    const timestamp = new Date().toISOString();

    for (const marketState of marketStates) {
      try {
        const basePrice = parseFloat(marketState.current_price.toString());
        
        // Generate realistic tick movement (±0.01% to ±0.05%)
        const tickRange = basePrice * 0.0005; // 0.05% range
        const tickMovement = (Math.random() - 0.5) * 2 * tickRange;
        const newPrice = basePrice + tickMovement;
        
        // Calculate realistic bid/ask spread (typically 1-3 pips for major pairs)
        const isJpyPair = marketState.symbol.includes('JPY');
        const pipValue = isJpyPair ? 0.01 : 0.0001;
        const spreadPips = 1.5 + (Math.random() * 1.5); // 1.5-3 pip spread
        const spread = spreadPips * pipValue;
        
        const bid = parseFloat((newPrice - spread/2).toFixed(isJpyPair ? 3 : 5));
        const ask = parseFloat((newPrice + spread/2).toFixed(isJpyPair ? 3 : 5));
        const midPrice = parseFloat(((bid + ask) / 2).toFixed(isJpyPair ? 3 : 5));

        // Update centralized market state with new tick
        const tickUpdate = {
          symbol: marketState.symbol,
          current_price: midPrice,
          bid,
          ask,
          last_update: timestamp,
          is_market_open: true,
          source: 'real-time-tick'
        };

        tickUpdates.push(tickUpdate);

        // Also add to price history for charts
        const historyEntry = {
          symbol: marketState.symbol,
          price: midPrice,
          bid,
          ask,
          timestamp,
          source: 'real-time-tick'
        };

        // Insert price history
        const { error: historyError } = await supabase
          .from('live_price_history')
          .insert(historyEntry);

        if (historyError) {
          console.error(`❌ Error inserting price history for ${marketState.symbol}:`, historyError);
        }

        console.log(`📈 ${marketState.symbol}: ${basePrice} → ${midPrice} (bid: ${bid}, ask: ${ask})`);

      } catch (error) {
        console.error(`❌ Error generating tick for ${marketState.symbol}:`, error);
      }
    }

    // Batch update centralized market state
    for (const update of tickUpdates) {
      const { error } = await supabase
        .from('centralized_market_state')
        .upsert(update, { onConflict: 'symbol' });
        
      if (error) {
        console.error(`❌ Error updating market state for ${update.symbol}:`, error);
      }
    }

    // Clean up old price history (keep last 100 points per pair)
    for (const marketState of marketStates) {
      const { data: oldRecords } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', marketState.symbol)
        .order('timestamp', { ascending: false })
        .range(100, 500);
        
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        await supabase
          .from('live_price_history')
          .delete()
          .in('id', idsToDelete);
      }
    }

    console.log('✅ Real-time tick generation completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${tickUpdates.length} real-time ticks`,
        pairs: tickUpdates.map(u => u.symbol),
        timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Real-time tick generator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
