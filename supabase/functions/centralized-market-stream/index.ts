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
    console.log('🚀 Tiingo centralized market stream with enhanced debugging...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const tiingoApiKey = Deno.env.get('TIINGO_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }
    
    if (!tiingoApiKey) {
      console.error('❌ Missing Tiingo API key');
      throw new Error('Missing Tiingo API key - check environment variables');
    }
    
    console.log('✅ All environment variables present');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enhanced market hours check with better logging
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    console.log(`📅 Market hours check: UTC Day ${utcDay}, Hour ${utcHour}`);
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    // Currency pairs for Tiingo
    const streamingPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY',
      'GBPNZD', 'AUDNZD', 'CADCHF', 'EURAUD', 'EURNZD', 'GBPCAD', 'NZDCAD',
      'NZDCHF', 'NZDJPY', 'AUDJPY', 'CHFJPY', 'EURCAD', 'GBPAUD',
      'USDNOK', 'USDSEK', 'AUDSGD'
    ];

    if (isMarketClosed) {
      console.log('📴 Market closed - running weekend/closure simulation');
      
      // Get existing market state for weekend simulation
      const { data: existingStates, error: existingError } = await supabase
        .from('centralized_market_state')
        .select('*')
        .limit(streamingPairs.length);
        
      if (existingError) {
        console.error('❌ Error fetching existing market state:', existingError);
      }
        
      if (existingStates && existingStates.length > 0) {
        console.log(`🔄 Updating ${existingStates.length} pairs with weekend simulation`);
        
        const weekendUpdates = [];
        const timestamp = new Date().toISOString();
        
        for (const state of existingStates) {
          try {
            const basePrice = parseFloat(state.current_price.toString());
            if (!basePrice || basePrice <= 0) continue;
            
            // Very small weekend movement (0.003% max)
            const weekendMovement = (Math.random() - 0.5) * basePrice * 0.00003;
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
          } catch (error) {
            console.error(`❌ Error processing weekend update for ${state.symbol}:`, error);
          }
        }
        
        // Update market state with weekend simulation
        if (weekendUpdates.length > 0) {
          for (const update of weekendUpdates) {
            const { error: updateError } = await supabase
              .from('centralized_market_state')
              .upsert(update, { onConflict: 'symbol' });
              
            if (updateError) {
              console.error(`❌ Weekend update error for ${update.symbol}:`, updateError);
            }
          }
          console.log(`✅ Weekend simulation completed for ${weekendUpdates.length} pairs`);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Weekend market simulation completed',
          isMarketOpen: false,
          timestamp: new Date().toISOString(),
          pairsUpdated: existingStates?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Market is open - fetch fresh Tiingo data
    console.log(`💱 Market OPEN - Fetching Tiingo data for ${streamingPairs.length} pairs`);
    
    const tickerList = streamingPairs.map(pair => pair.toLowerCase()).join(',');
    const tiingoUrl = `https://api.tiingo.com/tiingo/fx/top?tickers=${tickerList}&token=${tiingoApiKey}`;
    
    console.log(`🔄 Tiingo API call: ${tiingoUrl.replace(tiingoApiKey, '***API_KEY***')}`);
    
    const response = await fetch(tiingoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TradingSignalApp/2.0',
        'Authorization': `Token ${tiingoApiKey}`
      }
    });
    
    console.log(`📡 Tiingo API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Tiingo API error: ${response.status} - ${errorText}`);
      throw new Error(`Tiingo API error: ${response.status} - ${errorText}`);
    }
    
    const tiingoData = await response.json();
    console.log(`📊 Tiingo response: ${Array.isArray(tiingoData) ? tiingoData.length : 'non-array'} items`);
    
    if (!Array.isArray(tiingoData) || tiingoData.length === 0) {
      console.error('❌ Invalid Tiingo response format:', tiingoData);
      throw new Error('Invalid Tiingo response format or no data returned');
    }
    
    console.log(`✅ Processing ${tiingoData.length} Tiingo forex pairs`);

    // Process Tiingo data
    const marketUpdates = [];
    const priceHistory = [];
    const timestamp = new Date().toISOString();

    for (const tickerData of tiingoData) {
      try {
        const symbol = tickerData.ticker ? tickerData.ticker.toUpperCase() : null;
        if (!symbol || !streamingPairs.includes(symbol)) {
          console.warn(`⚠️ Skipping unsupported symbol: ${symbol}`);
          continue;
        }

        // Extract Tiingo price data with validation
        const midPrice = tickerData.midPrice;
        const bidPrice = tickerData.bidPrice;
        const askPrice = tickerData.askPrice;
        const quoteTimestamp = tickerData.quoteTimestamp;

        if (!midPrice || typeof midPrice !== 'number' || midPrice <= 0) {
          console.warn(`⚠️ Invalid price data for ${symbol}:`, { midPrice, bidPrice, askPrice });
          continue;
        }

        // Use actual bid/ask if available, otherwise calculate realistic spreads
        const actualBid = bidPrice && typeof bidPrice === 'number' && bidPrice > 0 ? bidPrice : 
          midPrice - (midPrice * (symbol.includes('JPY') ? 0.00002 : 0.00001));
        const actualAsk = askPrice && typeof askPrice === 'number' && askPrice > 0 ? askPrice : 
          midPrice + (midPrice * (symbol.includes('JPY') ? 0.00002 : 0.00001));

        const precision = symbol.includes('JPY') ? 3 : 5;
        const finalPrice = parseFloat(midPrice.toFixed(precision));
        const finalBid = parseFloat(actualBid.toFixed(precision));
        const finalAsk = parseFloat(actualAsk.toFixed(precision));

        // Market state update
        marketUpdates.push({
          symbol,
          current_price: finalPrice,
          bid: finalBid,
          ask: finalAsk,
          last_update: timestamp,
          is_market_open: true,
          source: 'tiingo-live'
        });

        // Price history entry
        priceHistory.push({
          symbol,
          price: finalPrice,
          bid: finalBid,
          ask: finalAsk,
          timestamp: quoteTimestamp || timestamp,
          source: 'tiingo-live'
        });
        
        console.log(`📈 ${symbol}: ${finalPrice} (${finalBid}/${finalAsk}) - Tiingo Live`);
      } catch (error) {
        console.error(`❌ Error processing ${tickerData.ticker || 'unknown'}:`, error);
      }
    }

    if (marketUpdates.length === 0) {
      console.error('❌ No valid market updates processed from Tiingo data');
      throw new Error('No valid market data could be processed from Tiingo');
    }

    console.log(`💾 Updating market state for ${marketUpdates.length} pairs`);

    // Update centralized market state
    let updateSuccessCount = 0;
    for (const update of marketUpdates) {
      try {
        const { error } = await supabase
          .from('centralized_market_state')
          .upsert(update, { onConflict: 'symbol' });
          
        if (error) {
          console.error(`❌ Error updating market state for ${update.symbol}:`, error);
        } else {
          updateSuccessCount++;
        }
      } catch (error) {
        console.error(`❌ Exception updating ${update.symbol}:`, error);
      }
    }

    console.log(`✅ Successfully updated ${updateSuccessCount}/${marketUpdates.length} market states`);

    // Insert price history
    if (priceHistory.length > 0) {
      const { error: historyError } = await supabase
        .from('live_price_history')
        .insert(priceHistory);
        
      if (historyError) {
        console.error('❌ Error inserting price history:', historyError);
      } else {
        console.log(`✅ Inserted ${priceHistory.length} price history records`);
      }
    }

    // Cleanup old price history (keep last 200 per pair)
    for (const pair of streamingPairs) {
      try {
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
      } catch (error) {
        console.error(`❌ Cleanup error for ${pair}:`, error);
      }
    }

    console.log('✅ Tiingo market stream update completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully updated ${updateSuccessCount} pairs with Tiingo data`,
        pairs: marketUpdates.map(u => u.symbol),
        pairsUpdated: updateSuccessCount,
        timestamp,
        source: 'tiingo-live',
        isMarketOpen: true,
        dataQuality: 'institutional-grade'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Critical error in Tiingo market stream:', error);
    console.error('📍 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        source: 'tiingo-error',
        details: error.stack
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
