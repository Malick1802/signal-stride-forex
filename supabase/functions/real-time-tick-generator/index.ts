import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced market session volatility and characteristics
const getMarketSession = () => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Asian session: 22:00 UTC - 08:00 UTC (lower volatility, range-bound)
  if (utcHour >= 22 || utcHour < 8) {
    return { 
      name: 'Asian', 
      volatility: 0.4, 
      trend: 0.1, // Less trending
      spreadMultiplier: 1.2 // Wider spreads
    };
  }
  // European session: 08:00 UTC - 16:00 UTC (medium-high volatility)
  else if (utcHour >= 8 && utcHour < 16) {
    return { 
      name: 'European', 
      volatility: 0.8, 
      trend: 0.3, 
      spreadMultiplier: 1.0 
    };
  }
  // US session overlap: 13:00 UTC - 17:00 UTC (highest volatility)
  else if (utcHour >= 13 && utcHour < 17) {
    return { 
      name: 'US-EU Overlap', 
      volatility: 1.2, 
      trend: 0.4, 
      spreadMultiplier: 0.8 // Tighter spreads due to high liquidity
    };
  }
  // US session: 16:00 UTC - 22:00 UTC (high volatility)
  else {
    return { 
      name: 'US', 
      volatility: 1.0, 
      trend: 0.35, 
      spreadMultiplier: 0.9 
    };
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

// Simulate market events that cause volatility spikes
const getMarketEventMultiplier = () => {
  // 2% chance of a market event (news, economic data, etc.)
  if (Math.random() < 0.02) {
    return 2.5 + Math.random() * 2; // 2.5x to 4.5x volatility spike
  }
  return 1;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔥 Real-time tick generator triggered (automated)...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if market is open
    if (!isMarketOpen()) {
      console.log('💤 Market is closed, generating minimal weekend movement');
      
      // During market close, generate very small random walks for demonstration
      const { data: weekendStates, error: weekendError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .limit(5); // Only update a few pairs during weekend
        
      if (!weekendError && weekendStates?.length > 0) {
        for (const state of weekendStates) {
          const basePrice = parseFloat(state.current_price.toString());
          const weekendMovement = (Math.random() - 0.5) * basePrice * 0.00005; // 0.005% max movement
          const newPrice = basePrice + weekendMovement;
          
          await supabase
            .from('centralized_market_state')
            .update({
              current_price: parseFloat(newPrice.toFixed(state.symbol.includes('JPY') ? 3 : 5)),
              last_update: new Date().toISOString(),
              source: 'weekend-minimal'
            })
            .eq('symbol', state.symbol);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          message: 'Market closed - minimal weekend movement generated',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current market session and characteristics
    const session = getMarketSession();
    const eventMultiplier = getMarketEventMultiplier();
    console.log(`📊 ${session.name} session (volatility: ${session.volatility}, event: ${eventMultiplier.toFixed(1)}x)`);

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

    console.log(`📊 Generating enhanced real-time ticks for ${marketStates.length} pairs`);

    const tickUpdates = [];
    const priceHistoryBatch = [];
    const timestamp = new Date().toISOString();

    for (const marketState of marketStates) {
      try {
        const basePrice = parseFloat(marketState.current_price.toString());
        const isJpyPair = marketState.symbol.includes('JPY');
        
        // Enhanced volatility calculation with session and event factors
        const baseVolatility = basePrice * 0.0003; // Increased base volatility
        const sessionVolatility = baseVolatility * session.volatility * eventMultiplier;
        
        // Advanced trend-following with momentum
        let trendBias = 0;
        let momentumFactor = 1;
        
        // Get recent price history for trend analysis (last 10 ticks)
        const { data: recentHistory } = await supabase
          .from('live_price_history')
          .select('price, timestamp')
          .eq('symbol', marketState.symbol)
          .order('timestamp', { ascending: false })
          .limit(10);
          
        if (recentHistory && recentHistory.length >= 3) {
          const prices = recentHistory.map(h => parseFloat(h.price.toString())).reverse();
          
          // Calculate short-term trend (last 3 ticks)
          const shortTrend = prices[prices.length - 1] - prices[prices.length - 3];
          
          // Calculate momentum (trend acceleration)
          if (prices.length >= 5) {
            const mediumTrend = prices[prices.length - 1] - prices[prices.length - 5];
            momentumFactor = Math.abs(mediumTrend) > Math.abs(shortTrend) ? 1.3 : 0.8;
          }
          
          // Apply trend bias based on session characteristics
          if (Math.random() < session.trend) {
            trendBias = (shortTrend > 0 ? 1 : -1) * sessionVolatility * 0.4 * momentumFactor;
          }
          
          // Add mean reversion for extreme moves (if price moved >0.1% in trend direction)
          const totalMove = prices[prices.length - 1] - prices[0];
          const movePercent = Math.abs(totalMove / basePrice);
          if (movePercent > 0.001) {
            trendBias *= 0.3; // Reduce trend following after big moves
          }
        }
        
        // Generate realistic tick movement with microstructure noise
        const randomWalk = (Math.random() - 0.5) * 2 * sessionVolatility;
        const microNoise = (Math.random() - 0.5) * sessionVolatility * 0.2; // Small random noise
        const tickMovement = randomWalk + trendBias + microNoise;
        
        const newPrice = basePrice + tickMovement;
        
        // Calculate dynamic bid/ask spread based on session and volatility
        const pipValue = isJpyPair ? 0.01 : 0.0001;
        const baseSpreadPips = isJpyPair ? 1.5 : 1.2;
        const volatilitySpread = session.volatility * eventMultiplier * 0.5;
        const spreadPips = (baseSpreadPips + volatilitySpread) * session.spreadMultiplier;
        const spread = spreadPips * pipValue;
        
        // Add spread asymmetry based on order flow simulation
        const orderFlowBias = (Math.random() - 0.5) * 0.3; // ±30% spread asymmetry
        const bidSpread = spread * (0.5 + orderFlowBias);
        const askSpread = spread * (0.5 - orderFlowBias);
        
        const bid = parseFloat((newPrice - bidSpread).toFixed(isJpyPair ? 3 : 5));
        const ask = parseFloat((newPrice + askSpread).toFixed(isJpyPair ? 3 : 5));
        const midPrice = parseFloat(((bid + ask) / 2).toFixed(isJpyPair ? 3 : 5));

        // Update centralized market state with enhanced tick
        const tickUpdate = {
          symbol: marketState.symbol,
          current_price: midPrice,
          bid,
          ask,
          last_update: timestamp,
          is_market_open: true,
          source: `${session.name.toLowerCase()}-tick-enhanced`
        };

        tickUpdates.push(tickUpdate);

        // Add to price history batch for efficient insertion
        priceHistoryBatch.push({
          symbol: marketState.symbol,
          price: midPrice,
          bid,
          ask,
          timestamp,
          source: `${session.name.toLowerCase()}-tick-enhanced`
        });

        console.log(`📈 ${marketState.symbol}: ${basePrice.toFixed(isJpyPair ? 3 : 5)} → ${midPrice} (${session.name}, ${eventMultiplier > 1 ? 'EVENT' : 'normal'})`);

      } catch (error) {
        console.error(`❌ Error generating tick for ${marketState.symbol}:`, error);
      }
    }

    // Batch insert price history for better performance
    if (priceHistoryBatch.length > 0) {
      const { error: historyError } = await supabase
        .from('live_price_history')
        .insert(priceHistoryBatch);

      if (historyError) {
        console.error('❌ Error batch inserting price history:', historyError);
      } else {
        console.log(`📊 Batch inserted ${priceHistoryBatch.length} price history records`);
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

    // Efficient cleanup: keep only last 150 points per pair (was 200, optimized for performance)
    const cleanupPromises = marketStates.map(async (marketState) => {
      const { data: oldRecords } = await supabase
        .from('live_price_history')
        .select('id')
        .eq('symbol', marketState.symbol)
        .order('timestamp', { ascending: false })
        .range(150, 500);
        
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        await supabase
          .from('live_price_history')
          .delete()
          .in('id', idsToDelete);
      }
    });

    // Execute cleanup in parallel for better performance
    await Promise.allSettled(cleanupPromises);

    console.log(`✅ Generated ${tickUpdates.length} enhanced real-time ticks (${session.name} session, ${eventMultiplier > 1 ? 'market event' : 'normal conditions'})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${tickUpdates.length} enhanced ticks`,
        session: session.name,
        volatility: session.volatility,
        eventMultiplier: eventMultiplier > 1 ? eventMultiplier : null,
        pairs: tickUpdates.map(u => u.symbol),
        timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Enhanced real-time tick generator error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
