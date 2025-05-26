import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Market session volatility multipliers
const getMarketSession = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Asian session: 22:00 UTC - 08:00 UTC (low volatility)
  if (utcHour >= 22 || utcHour < 8) {
    return { name: 'Asian', volatility: 0.3 };
  }
  // European session: 08:00 UTC - 16:00 UTC (medium volatility)
  else if (utcHour >= 8 && utcHour < 16) {
    return { name: 'European', volatility: 0.6 };
  }
  // US session: 13:00 UTC - 22:00 UTC (high volatility)
  else {
    return { name: 'US', volatility: 1.0 };
  }
};

const isMarketOpen = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  
  // Market closed from Friday 22:00 UTC to Sunday 22:00 UTC
  const isFridayEvening = utcDay === 5 && utcHour >= 22;
  const isSaturday = utcDay === 6;
  const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
  
  return !(isFridayEvening || isSaturday || isSundayBeforeOpen);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔥 Real-time tick generator triggered...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if market is open
    if (!isMarketOpen()) {
      console.log('💤 Market is closed, skipping tick generation');
      return new Response(
        JSON.stringify({ 
          message: 'Market closed - no ticks generated',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current market session
    const session = getMarketSession();
    console.log(`📊 Current session: ${session.name} (volatility: ${session.volatility})`);

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

    console.log(`📊 Generating enhanced ticks for ${marketStates.length} pairs`);

    const tickUpdates = [];
    const timestamp = new Date().toISOString();

    for (const marketState of marketStates) {
      try {
        const basePrice = parseFloat(marketState.current_price.toString());
        
        // Enhanced tick movement with session-based volatility
        const baseVolatility = basePrice * 0.0002; // 0.02% base range
        const sessionVolatility = baseVolatility * session.volatility;
        
        // Add slight trend following (10% chance of continuing previous direction)
        let trendBias = 0;
        if (Math.random() < 0.1) {
          // Get recent price history to determine trend
          const { data: recentHistory } = await supabase
            .from('live_price_history')
            .select('price')
            .eq('symbol', marketState.symbol)
            .order('timestamp', { ascending: false })
            .limit(5);
            
          if (recentHistory && recentHistory.length >= 2) {
            const latest = parseFloat(recentHistory[0].price.toString());
            const previous = parseFloat(recentHistory[1].price.toString());
            trendBias = (latest > previous ? 1 : -1) * sessionVolatility * 0.3;
          }
        }
        
        // Generate realistic tick movement
        const randomMovement = (Math.random() - 0.5) * 2 * sessionVolatility;
        const tickMovement = randomMovement + trendBias;
        const newPrice = basePrice + tickMovement;
        
        // Calculate realistic bid/ask spread
        const isJpyPair = marketState.symbol.includes('JPY');
        const pipValue = isJpyPair ? 0.01 : 0.0001;
        const spreadPips = 1.2 + (Math.random() * 1.8) + (session.volatility * 0.5); // Dynamic spread
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
          source: `${session.name.toLowerCase()}-tick`
        };

        tickUpdates.push(tickUpdate);

        // Add to price history for charts
        const historyEntry = {
          symbol: marketState.symbol,
          price: midPrice,
          bid,
          ask,
          timestamp,
          source: `${session.name.toLowerCase()}-tick`
        };

        // Insert price history
        const { error: historyError } = await supabase
          .from('live_price_history')
          .insert(historyEntry);

        if (historyError) {
          console.error(`❌ Error inserting price history for ${marketState.symbol}:`, historyError);
        }

        console.log(`📈 ${marketState.symbol}: ${basePrice} → ${midPrice} (${session.name} session)`);

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

    // Clean up old price history (keep last 200 points per pair for performance)
    for (const marketState of marketStates) {
      const { data: oldRecords } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', marketState.symbol)
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

    console.log(`✅ Generated ${tickUpdates.length} enhanced real-time ticks (${session.name} session)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${tickUpdates.length} enhanced ticks`,
        session: session.name,
        volatility: session.volatility,
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
