
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

// Fallback market data for testing
const getFallbackMarketData = () => {
  console.log('🔄 Using fallback market data for testing...');
  
  const basePrices = {
    'EURUSD': 1.0850,
    'GBPUSD': 1.2650,
    'USDJPY': 150.25,
    'USDCHF': 0.8750,
    'AUDUSD': 0.6580,
    'USDCAD': 1.3520
  };

  const fallbackData: Record<string, any> = {};
  const timestamp = new Date().toISOString();

  Object.entries(basePrices).forEach(([pair, basePrice]) => {
    // Add small random variation (±0.05%)
    const variation = (Math.random() - 0.5) * basePrice * 0.0005;
    const currentPrice = basePrice + variation;
    
    const isJpyPair = pair.includes('JPY');
    const precision = isJpyPair ? 3 : 5;
    const spreadMultiplier = isJpyPair ? 0.03 : 0.00015;
    
    const spread = currentPrice * spreadMultiplier;
    const bid = currentPrice - (spread / 2);
    const ask = currentPrice + (spread / 2);

    fallbackData[pair] = {
      price: parseFloat(currentPrice.toFixed(precision)),
      bid: parseFloat(bid.toFixed(precision)),
      ask: parseFloat(ask.toFixed(precision)),
      timestamp: timestamp,
      source: 'fallback-testing'
    };
  });

  console.log('✅ Generated fallback data for testing:', Object.keys(fallbackData));
  return fallbackData;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Phase 1: Enhanced API testing with detailed error logging...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const tiingoApiKey = Deno.env.get('TIINGO_API_KEY');
    
    console.log('🔍 Environment check:');
    console.log(`- SUPABASE_URL: ${supabaseUrl ? 'SET' : 'MISSING'}`);
    console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'SET' : 'MISSING'}`);
    console.log(`- TIINGO_API_KEY: ${tiingoApiKey ? 'SET' : 'MISSING'}`);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enhanced market hours check
    console.log('📅 Phase 2: Market hours validation...');
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    console.log(`📊 Current time: ${now.toISOString()}, UTC Day: ${utcDay}, UTC Hour: ${utcHour}`);
    
    const isFridayEvening = utcDay === 5 && utcHour >= 22;
    const isSaturday = utcDay === 6;
    const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
    const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;

    console.log(`🏪 Market status: ${isMarketClosed ? 'CLOSED' : 'OPEN'}`);

    // Test API key and connection even when market is closed
    if (!tiingoApiKey) {
      console.error('❌ TIINGO_API_KEY not found in environment variables');
      console.log('🔄 Proceeding with fallback data for testing...');
      
      const fallbackData = getFallbackMarketData();
      const marketDataBatch = Object.entries(fallbackData).map(([symbol, data]) => ({
        symbol,
        price: data.price,
        bid: data.bid,
        ask: data.ask,
        source: data.source,
        timestamp: data.timestamp,
        created_at: new Date().toISOString()
      }));

      // Insert fallback data
      const { data: insertData, error: insertError } = await supabase
        .from('live_market_data')
        .insert(marketDataBatch)
        .select('symbol, price, created_at');

      if (insertError) {
        console.error('❌ Error inserting fallback data:', insertError);
        return new Response(
          JSON.stringify({ error: `Fallback data insertion failed: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Using fallback data - TIINGO_API_KEY not configured',
          pairs: marketDataBatch.map(item => item.symbol),
          source: 'fallback-testing',
          recordsInserted: insertData?.length || 0,
          apiKeyIssue: true,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isMarketClosed) {
      console.log('📴 Market closed - but will test API connection anyway');
      
      // Test single API call during market closure for diagnostic purposes
      console.log('🧪 Testing API connection with single request...');
      const testPair = 'eurusd';
      const testUrl = `https://api.tiingo.com/tiingo/fx/${testPair}/top?token=${tiingoApiKey}`;
      
      console.log(`🔍 Test API URL: ${testUrl.replace(tiingoApiKey, 'HIDDEN_API_KEY')}`);
      console.log('🔍 Test headers:', {
        'Accept': 'application/json',
        'User-Agent': 'ForexSignalApp/2.0',
        'Authorization': 'Token [HIDDEN]'
      });

      try {
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ForexSignalApp/2.0',
            'Authorization': `Token ${tiingoApiKey}`
          }
        });
        
        console.log(`🔍 Test API Response Status: ${testResponse.status}`);
        console.log(`🔍 Test API Response Headers:`, Object.fromEntries(testResponse.headers.entries()));
        
        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          console.error(`❌ API Test Failed: ${testResponse.status} - ${testResponse.statusText}`);
          console.error(`❌ Error Response Body: ${errorText}`);
          console.error(`❌ This indicates API key or permissions issue`);
          
          // Use fallback data when API test fails
          console.log('🔄 API test failed - using fallback data...');
          const fallbackData = getFallbackMarketData();
          const marketDataBatch = Object.entries(fallbackData).map(([symbol, data]) => ({
            symbol,
            price: data.price,
            bid: data.bid,
            ask: data.ask,
            source: `${data.source}-api-test-failed`,
            timestamp: data.timestamp,
            created_at: new Date().toISOString()
          }));

          const { data: insertData, error: insertError } = await supabase
            .from('live_market_data')
            .insert(marketDataBatch)
            .select('symbol, price, created_at');

          return new Response(
            JSON.stringify({
              success: true,
              message: 'API test failed - using fallback data',
              pairs: marketDataBatch.map(item => item.symbol),
              source: 'fallback-api-test-failed',
              apiError: `${testResponse.status}: ${errorText}`,
              recordsInserted: insertData?.length || 0,
              timestamp: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('✅ API test successful - API key is working');
          const testData = await testResponse.json();
          console.log('✅ Test data received:', JSON.stringify(testData, null, 2));
        }
      } catch (error) {
        console.error(`❌ API Test Exception: ${error.message}`);
        console.error(`❌ This indicates network or API endpoint issue`);
        
        // Use fallback data when API test throws exception
        const fallbackData = getFallbackMarketData();
        const marketDataBatch = Object.entries(fallbackData).map(([symbol, data]) => ({
          symbol,
          price: data.price,
          bid: data.bid,
          ask: data.ask,
          source: `${data.source}-api-exception`,
          timestamp: data.timestamp,
          created_at: new Date().toISOString()
        }));

        const { data: insertData, error: insertError } = await supabase
          .from('live_market_data')
          .insert(marketDataBatch)
          .select('symbol, price, created_at');

        return new Response(
          JSON.stringify({
            success: true,
            message: 'API exception - using fallback data',
            pairs: marketDataBatch.map(item => item.symbol),
            source: 'fallback-api-exception',
            apiException: error.message,
            recordsInserted: insertData?.length || 0,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Market closed - API test completed successfully',
          marketStatus: 'CLOSED',
          apiStatus: 'WORKING',
          timestamp: now.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Circuit breaker check
    if (!circuitBreaker.canProceed()) {
      console.log('🚫 Circuit breaker active - using fallback data');
      const fallbackData = getFallbackMarketData();
      const marketDataBatch = Object.entries(fallbackData).map(([symbol, data]) => ({
        symbol,
        price: data.price,
        bid: data.bid,
        ask: data.ask,
        source: `${data.source}-circuit-breaker`,
        timestamp: data.timestamp,
        created_at: new Date().toISOString()
      }));

      const { data: insertData } = await supabase
        .from('live_market_data')
        .insert(marketDataBatch)
        .select('symbol, price, created_at');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Circuit breaker active - using fallback data',
          pairs: marketDataBatch.map(item => item.symbol),
          source: 'fallback-circuit-breaker',
          recordsInserted: insertData?.length || 0,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Market is open - attempt live API calls with detailed logging
    const supportedPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'];
    console.log(`💱 Phase 3: Market OPEN - attempting live API calls for ${supportedPairs.length} pairs`);

    const marketData: Record<string, any> = {};
    let successfulPairs = 0;
    const failedPairs: string[] = [];
    const apiErrors: string[] = [];

    for (const pair of supportedPairs) {
      try {
        const tiingoPair = pair.toLowerCase();
        const tiingoUrl = `https://api.tiingo.com/tiingo/fx/${tiingoPair}/top?token=${tiingoApiKey}`;
        
        console.log(`📡 Fetching ${pair}:`);
        console.log(`  URL: ${tiingoUrl.replace(tiingoApiKey, 'HIDDEN_KEY')}`);
        
        const requestHeaders = {
          'Accept': 'application/json',
          'User-Agent': 'ForexSignalApp/2.0',
          'Authorization': `Token ${tiingoApiKey}`
        };
        console.log(`  Headers:`, { ...requestHeaders, 'Authorization': 'Token [HIDDEN]' });
        
        const response = await fetch(tiingoUrl, {
          method: 'GET',
          headers: requestHeaders
        });
        
        console.log(`📊 ${pair} Response:`);
        console.log(`  Status: ${response.status} ${response.statusText}`);
        console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error for ${pair}:`);
          console.error(`  Status: ${response.status}`);
          console.error(`  Status Text: ${response.statusText}`);
          console.error(`  Response Body: ${errorText}`);
          console.error(`  URL: ${tiingoUrl.replace(tiingoApiKey, 'HIDDEN_KEY')}`);
          
          apiErrors.push(`${pair}: HTTP ${response.status} - ${errorText}`);
          failedPairs.push(pair);
          continue;
        }
        
        const data = await response.json();
        console.log(`📋 ${pair} Data:`, JSON.stringify(data, null, 2));
        
        if (Array.isArray(data) && data.length > 0) {
          const tickerData = data[0];
          const midPrice = tickerData.midPrice || tickerData.close || tickerData.last;
          const bidPrice = tickerData.bidPrice || (midPrice ? midPrice * 0.9999 : null);
          const askPrice = tickerData.askPrice || (midPrice ? midPrice * 1.0001 : null);
          
          if (midPrice && typeof midPrice === 'number' && midPrice > 0) {
            marketData[pair] = {
              price: midPrice,
              bid: bidPrice,
              ask: askPrice,
              timestamp: tickerData.timestamp || new Date().toISOString(),
              source: 'tiingo-api'
            };
            successfulPairs++;
            console.log(`✅ ${pair}: Successfully processed price ${midPrice}`);
          } else {
            console.warn(`⚠️ Invalid price for ${pair}:`, { midPrice, bidPrice, askPrice });
            failedPairs.push(pair);
          }
        } else {
          console.warn(`⚠️ No data for ${pair}:`, data);
          failedPairs.push(pair);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Exception for ${pair}:`, error.message);
        console.error(`❌ Stack trace:`, error.stack);
        apiErrors.push(`${pair}: Exception - ${error.message}`);
        failedPairs.push(pair);
      }
    }

    console.log(`📊 API Results: ${successfulPairs}/${supportedPairs.length} successful`);
    
    // If all API calls failed, use fallback data
    if (successfulPairs === 0) {
      circuitBreaker.recordFailure();
      console.log('❌ All API calls failed - using fallback data');
      
      const fallbackData = getFallbackMarketData();
      const marketDataBatch = Object.entries(fallbackData).map(([symbol, data]) => ({
        symbol,
        price: data.price,
        bid: data.bid,
        ask: data.ask,
        source: `${data.source}-api-failed`,
        timestamp: data.timestamp,
        created_at: new Date().toISOString()
      }));

      const { data: insertData, error: insertError } = await supabase
        .from('live_market_data')
        .insert(marketDataBatch)
        .select('symbol, price, created_at');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'All API calls failed - using fallback data',
          pairs: marketDataBatch.map(item => item.symbol),
          source: 'fallback-all-api-failed',
          apiErrors: apiErrors,
          failedPairs: failedPairs,
          recordsInserted: insertData?.length || 0,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    circuitBreaker.recordSuccess();

    // Process successful API data
    const marketDataBatch = [];
    const timestamp = new Date().toISOString();

    for (const [symbol, data] of Object.entries(marketData)) {
      const price = parseFloat(data.price.toString());
      const bid = parseFloat(data.bid?.toString() || price.toString());
      const ask = parseFloat(data.ask?.toString() || price.toString());
      
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
    }

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
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Live API data processed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${marketDataBatch.length} currency pairs with live Tiingo data`,
        pairs: marketDataBatch.map(item => item.symbol),
        source: 'tiingo-live-api',
        recordsInserted: insertData?.length || marketDataBatch.length,
        successfulPairs,
        failedPairs: failedPairs.length,
        apiErrors: apiErrors.length > 0 ? apiErrors : undefined,
        timestamp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error.message);
    console.error('📍 Error stack:', error.stack);
    
    circuitBreaker.recordFailure();
    
    // Final fallback - always try to provide some data
    try {
      console.log('🔄 Critical error - attempting final fallback...');
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const fallbackData = getFallbackMarketData();
      const marketDataBatch = Object.entries(fallbackData).map(([symbol, data]) => ({
        symbol,
        price: data.price,
        bid: data.bid,
        ask: data.ask,
        source: `${data.source}-critical-error`,
        timestamp: data.timestamp,
        created_at: new Date().toISOString()
      }));

      await supabase.from('live_market_data').insert(marketDataBatch);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Critical error occurred - using emergency fallback data',
          pairs: marketDataBatch.map(item => item.symbol),
          source: 'fallback-critical-error',
          criticalError: error.message,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fallbackError) {
      console.error('💥 Even fallback failed:', fallbackError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'fetch-market-data-enhanced'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
