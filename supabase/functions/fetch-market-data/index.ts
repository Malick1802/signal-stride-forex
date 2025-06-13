
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 300000; // 5 minutes

  canProceed(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.failures = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  recordFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
  }

  recordSuccess() {
    this.failures = 0;
  }
}

const circuitBreaker = new CircuitBreaker();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Phase 1: Initializing enhanced Tiingo market data fetch with comprehensive error handling...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const tiingoApiKey = Deno.env.get('TIINGO_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!tiingoApiKey) {
      console.error('❌ Tiingo API key not configured');
      return new Response(
        JSON.stringify({ error: 'Tiingo API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Phase 1: All environment variables validated');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Phase 2: Enhanced market hours check with proper timezone handling
    console.log('📅 Phase 2: Performing comprehensive market hours validation...');
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    console.log(`📊 Current time: ${now.toISOString()}, UTC Day: ${utcDay}, UTC Hour: ${utcHour}`);
    
    // More precise market hours logic
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    console.log(`📈 Market status analysis: Friday evening: ${isFridayEvening}, Saturday: ${isSaturday}, Sunday before open: ${isSundayBeforeOpen}`);
    console.log(`🏪 Market is: ${isMarketClosed ? 'CLOSED' : 'OPEN'}`);

    if (isMarketClosed) {
      console.log('📴 Phase 2: Market definitively closed - no API calls will be made');
      
      // Return success without making any API calls
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Market closed - no data fetching performed',
          marketStatus: 'CLOSED',
          timestamp: now.toISOString(),
          pairs: [],
          source: 'market-hours-check'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phase 1: Circuit breaker check
    if (!circuitBreaker.canProceed()) {
      console.log('🚫 Circuit breaker active - too many recent failures');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Circuit breaker active - service temporarily unavailable',
          timestamp: now.toISOString()
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Currency pairs supported by Tiingo (reduced set for testing)
    const supportedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'
    ];

    console.log(`💱 Phase 1: Testing Tiingo API with ${supportedPairs.length} major pairs first...`);

    // Clean old data before inserting new data
    console.log('🧹 Cleaning old market data...');
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { error: deleteError } = await supabase
        .from('live_market_data')
        .delete()
        .lt('created_at', sixHoursAgo);
        
      if (deleteError) {
        console.warn('⚠️ Cleanup warning:', deleteError);
      } else {
        console.log(`✅ Old data cleanup completed`);
      }
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error);
    }

    const marketData: Record<string, any> = {};
    let successfulPairs = 0;
    const failedPairs: string[] = [];
    const apiErrors: string[] = [];

    // Process pairs one by one with detailed error tracking
    for (const pair of supportedPairs) {
      try {
        const tiingoPair = pair.toLowerCase();
        const tiingoUrl = `https://api.tiingo.com/tiingo/fx/${tiingoPair}/top?token=${tiingoApiKey}`;
        
        console.log(`📡 Phase 1: Testing ${pair} with URL: ${tiingoUrl.replace(tiingoApiKey, 'HIDDEN')}`);
        
        const response = await fetch(tiingoUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ForexSignalApp/2.0',
            'Authorization': `Token ${tiingoApiKey}`
          }
        });
        
        console.log(`📊 ${pair} response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Tiingo API error for ${pair}: ${response.status} - ${errorText}`);
          apiErrors.push(`${pair}: ${response.status} - ${errorText}`);
          failedPairs.push(pair);
          
          // If we get 422, it might be API key or permissions issue
          if (response.status === 422) {
            console.error(`🚨 HTTP 422 for ${pair} - possible API key or permissions issue`);
          }
          continue;
        }
        
        const data = await response.json();
        console.log(`📋 ${pair} data structure:`, JSON.stringify(data, null, 2));
        
        if (Array.isArray(data) && data.length > 0) {
          const tickerData = data[0];
          
          // Extract price data from Tiingo response
          const midPrice = tickerData.midPrice || tickerData.close || tickerData.last;
          const bidPrice = tickerData.bidPrice || (midPrice ? midPrice * 0.9999 : null);
          const askPrice = tickerData.askPrice || (midPrice ? midPrice * 1.0001 : null);
          
          console.log(`💰 ${pair} prices: mid=${midPrice}, bid=${bidPrice}, ask=${askPrice}`);
          
          if (midPrice && typeof midPrice === 'number' && midPrice > 0) {
            marketData[pair] = {
              price: midPrice,
              bid: bidPrice,
              ask: askPrice,
              timestamp: tickerData.timestamp || new Date().toISOString(),
              source: 'tiingo-api'
            };
            successfulPairs++;
            console.log(`✅ ${pair}: ${midPrice.toFixed(5)} successfully processed`);
          } else {
            console.warn(`⚠️ Invalid price data for ${pair}:`, tickerData);
            failedPairs.push(pair);
          }
        } else {
          console.warn(`⚠️ No data returned for ${pair}:`, data);
          failedPairs.push(pair);
        }
        
        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error fetching ${pair}:`, error.message);
        apiErrors.push(`${pair}: ${error.message}`);
        failedPairs.push(pair);
      }
    }

    console.log(`📊 Phase 1 Results: Successfully fetched ${successfulPairs}/${supportedPairs.length} pairs`);
    if (failedPairs.length > 0) {
      console.log(`⚠️ Failed pairs: ${failedPairs.join(', ')}`);
    }
    if (apiErrors.length > 0) {
      console.log(`🚨 API Errors:`, apiErrors);
    }

    if (successfulPairs === 0) {
      circuitBreaker.recordFailure();
      console.error('❌ Phase 1: All API calls failed - circuit breaker activated');
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'All Tiingo API calls failed',
          apiErrors,
          failedPairs,
          timestamp: now.toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record success for circuit breaker
    circuitBreaker.recordSuccess();

    // Phase 3: Prepare market data for insertion with validation
    console.log('💾 Phase 3: Preparing validated market data for database insertion...');
    const marketDataBatch = [];
    const timestamp = new Date().toISOString();

    for (const [symbol, data] of Object.entries(marketData)) {
      try {
        const price = parseFloat(data.price.toString());
        const bid = parseFloat(data.bid?.toString() || price.toString());
        const ask = parseFloat(data.ask?.toString() || price.toString());
        
        if (isNaN(price) || price <= 0 || !isFinite(price)) {
          console.warn(`❌ Invalid price for ${symbol}: ${data.price}`);
          continue;
        }
        
        const isJpyPair = symbol.includes('JPY');
        const precision = isJpyPair ? 3 : 5;

        marketDataBatch.push({
          symbol,
          price: parseFloat(price.toFixed(precision)),
          bid: parseFloat(bid.toFixed(precision)),
          ask: parseFloat(ask.toFixed(precision)),
          source: data.source,
          timestamp: data.timestamp,
          created_at: timestamp
        });
        
        console.log(`✅ Prepared ${symbol}: ${price.toFixed(precision)}`);
      } catch (error) {
        console.error(`❌ Error preparing data for ${symbol}:`, error);
      }
    }

    console.log(`📊 Phase 3: Prepared ${marketDataBatch.length} validated records for insertion`);

    if (marketDataBatch.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid market data to insert after validation',
          timestamp: now.toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert with detailed error handling
    console.log('🚀 Phase 3: Inserting validated data into database...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('live_market_data')
      .insert(marketDataBatch)
      .select('symbol, price, created_at');

    if (insertError) {
      console.error('❌ Database insertion failed:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database insertion failed: ${insertError.message}`,
          timestamp: now.toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Phase 3: Database insertion successful!');
    console.log(`📊 Records inserted: ${insertData?.length || 0}`);

    const responseData = { 
      success: true, 
      message: `Successfully processed ${marketDataBatch.length} currency pairs with Tiingo data`,
      pairs: marketDataBatch.map(item => item.symbol),
      marketOpen: !isMarketClosed,
      timestamp,
      source: 'tiingo-api',
      dataType: 'real-time',
      recordsInserted: insertData?.length || marketDataBatch.length,
      successfulPairs,
      failedPairs: failedPairs.length,
      apiErrors: apiErrors.length > 0 ? apiErrors : undefined
    };
    
    console.log('🎉 Phase 3: Tiingo integration completed successfully');
    console.log('📊 Final stats:', responseData);
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR in enhanced Tiingo integration:', error.message);
    console.error('📍 Error stack:', error.stack);
    
    circuitBreaker.recordFailure();
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'fetch-market-data-enhanced',
        phase: 'error-handling'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
