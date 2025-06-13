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
    console.log('🎯 Real-time tick generator using Tiingo baseline data...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check market hours
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    if (isMarketClosed) {
      console.log('💤 Market closed - skipping tick generation');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Market closed - no ticks generated',
          isMarketOpen: false,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get fresh Tiingo baseline data from centralized market state
    const { data: marketStates, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .eq('is_market_open', true)
      .order('last_update', { ascending: false });

    if (marketError) {
      throw new Error(`Failed to fetch market state: ${marketError.message}`);
    }

    if (!marketStates || marketStates.length === 0) {
      console.log('⚠️ No active market data found - triggering baseline update');
      
      // Trigger centralized market stream to get fresh Tiingo data
      const { error: triggerError } = await supabase.functions.invoke('centralized-market-stream');
      if (triggerError) {
        console.error('❌ Failed to trigger market update:', triggerError);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No baseline data - triggered fresh Tiingo fetch',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Generating realistic ticks from ${marketStates.length} Tiingo baseline prices`);

    const tickUpdates = [];
    const timestamp = new Date().toISOString();
    const tickTime = new Date().getTime();

    // Generate realistic micro-movements based on Tiingo data
    for (const state of marketStates) {
      try {
        const basePrice = parseFloat(state.current_price.toString());
        const baseBid = parseFloat(state.bid.toString());
        const baseAsk = parseFloat(state.ask.toString());
        
        if (!basePrice || basePrice <= 0) continue;

        // Generate realistic tick movement (0.001% to 0.01% of current price)
        const volatility = getVolatilityForPair(state.symbol);
        const maxMovement = basePrice * volatility;
        const priceMovement = (Math.random() - 0.5) * maxMovement;
        
        // Apply movement to create new tick
        const newPrice = basePrice + priceMovement;
        const precision = state.symbol.includes('JPY') ? 3 : 5;
        const tickPrice = parseFloat(newPrice.toFixed(precision));
        
        // Adjust bid/ask proportionally
        const spread = baseAsk - baseBid;
        const midAdjustment = tickPrice - basePrice;
        const newBid = parseFloat((baseBid + midAdjustment).toFixed(precision));
        const newAsk = parseFloat((baseAsk + midAdjustment).toFixed(precision));

        tickUpdates.push({
          symbol: state.symbol,
          price: tickPrice,
          bid: newBid,
          ask: newAsk,
          timestamp: timestamp,
          source: `tiingo-tick-${getMarketSession()}`
        });

        console.log(`📍 ${state.symbol}: ${basePrice} → ${tickPrice} (${priceMovement > 0 ? '+' : ''}${priceMovement.toFixed(6)})`);
      } catch (error) {
        console.error(`❌ Error generating tick for ${state.symbol}:`, error);
      }
    }

    if (tickUpdates.length === 0) {
      console.log('⚠️ No valid ticks generated');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No valid tick data generated',
          timestamp
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert realistic tick data
    const { error: insertError } = await supabase
      .from('live_price_history')
      .insert(tickUpdates);

    if (insertError) {
      console.error('❌ Error inserting tick data:', insertError);
      throw new Error(`Failed to insert tick data: ${insertError.message}`);
    }

    // Cleanup old tick data (keep last 500 per pair)
    for (const pair of [...new Set(tickUpdates.map(t => t.symbol))]) {
      const { data: oldTicks } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', pair)
        .order('timestamp', { ascending: false })
        .range(500, 2000);
        
      if (oldTicks && oldTicks.length > 0) {
        const idsToDelete = oldTicks.map(t => t.id);
        await supabase
          .from('live_price_history')
          .delete()
          .in('id', idsToDelete);
      }
    }

    console.log(`✅ Generated ${tickUpdates.length} realistic ticks from Tiingo baseline data`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${tickUpdates.length} realistic ticks`,
        pairs: tickUpdates.map(t => t.symbol),
        timestamp,
        source: 'tiingo-tick-generator',
        isMarketOpen: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Tick generator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        source: 'tick-generator-error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Get volatility factor for different currency pairs
function getVolatilityForPair(symbol: string): number {
  // Major pairs (lower volatility)
  const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
  if (majorPairs.includes(symbol)) {
    return 0.00005; // 0.005% max movement
  }
  
  // Minor pairs (medium volatility)
  const minorPairs = ['AUDUSD', 'USDCAD', 'NZDUSD'];
  if (minorPairs.includes(symbol)) {
    return 0.00008; // 0.008% max movement
  }
  
  // Cross pairs (higher volatility)
  return 0.00012; // 0.012% max movement
}

// Get current market session
function getMarketSession(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 22 || utcHour < 8) {
    return 'asian';
  } else if (utcHour >= 8 && utcHour < 16) {
    return 'european';
  } else if (utcHour >= 13 && utcHour < 17) {
    return 'overlap';
  } else {
    return 'us';
  }
}
