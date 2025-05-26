
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== FETCH-MARKET-DATA FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Getting environment variables...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY');
    
    console.log('Environment check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
    console.log('- FASTFOREX_API_KEY:', fastForexApiKey ? 'SET' : 'MISSING');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!fastForexApiKey) {
      console.log('⚠️ FastForex API key not configured, using demo data');
      return generateDemoResponse(supabaseUrl, supabaseServiceKey);
    }
    
    console.log('✅ Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🕐 Checking market status...');
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                        (utcDay === 0 && utcHour >= 22) || 
                        (utcDay === 5 && utcHour < 22);

    console.log(`📊 Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`);
    console.log(`   - UTC Day: ${utcDay} (0=Sunday, 6=Saturday)`);
    console.log(`   - UTC Hour: ${utcHour}`);

    // All pairs that we need to support (including cross-currency pairs)
    const requiredPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY', 
      'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD', 'GBPAUD', 'GBPNZD', 'GBPCAD', 
      'AUDNZD', 'AUDCAD', 'NZDCAD', 'AUDSGD', 'NZDCHF', 'USDNOK', 'USDSEK'
    ];

    console.log(`💱 Will calculate ${requiredPairs.length} currency pairs including cross-pairs`);

    let baseRates: Record<string, number> = {};
    let dataSource = 'unknown';
    
    // First, get the USD-based rates from FastForex
    try {
      const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'NOK', 'SEK', 'SGD'];
      const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${currencies.join(',')}&api_key=${fastForexApiKey}`;
      
      console.log('🌐 Calling FastForex fetch-multi endpoint...');
      console.log('   Target currencies:', currencies.join(', '));
      
      const response = await fetch(fetchMultiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ForexSignalApp/1.0'
        }
      });
      
      console.log('📡 FastForex API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FastForex API error:', response.status, errorText);
        throw new Error(`API responded with ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📋 Raw API response data:', JSON.stringify(data, null, 2));
      
      if (data.results && typeof data.results === 'object') {
        console.log('✅ Processing USD-based rates...');
        baseRates = { USD: 1, ...data.results };
        dataSource = 'fetch-multi-usd';
        console.log('💾 Base rates obtained:', Object.keys(baseRates));
      } else {
        console.error('❌ No results object found in API response');
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('❌ FastForex API error:', error.message);
      // Use fallback rates
      baseRates = {
        USD: 1, EUR: 0.87744, GBP: 0.73735, JPY: 142.58633, CHF: 0.82121,
        AUD: 1.53586, CAD: 1.3715, NZD: 1.6664, NOK: 10.08177, SEK: 9.49632, SGD: 1.35
      };
      dataSource = 'fallback';
      console.log('📊 Using fallback base rates');
    }

    // Now calculate all required currency pairs using cross-currency calculations
    console.log('🧮 Calculating all currency pairs including cross-pairs...');
    const marketData: Record<string, number> = {};
    let calculatedCount = 0;

    for (const pair of requiredPairs) {
      try {
        const baseCurrency = pair.substring(0, 3);
        const quoteCurrency = pair.substring(3, 6);
        
        console.log(`🔄 Calculating ${pair} (${baseCurrency}/${quoteCurrency})`);
        
        if (baseRates[baseCurrency] && baseRates[quoteCurrency]) {
          // Calculate cross rate: (USD/BASE) / (USD/QUOTE) = QUOTE/BASE, so invert for BASE/QUOTE
          const rate = baseRates[quoteCurrency] / baseRates[baseCurrency];
          marketData[pair] = rate;
          calculatedCount++;
          console.log(`✅ ${pair}: ${rate.toFixed(5)}`);
        } else {
          console.warn(`⚠️ Missing base rates for ${pair} (${baseCurrency}: ${baseRates[baseCurrency]}, ${quoteCurrency}: ${baseRates[quoteCurrency]})`);
        }
      } catch (error) {
        console.error(`❌ Error calculating ${pair}:`, error);
        continue;
      }
    }

    console.log(`📊 Successfully calculated ${calculatedCount}/${requiredPairs.length} currency pairs`);

    if (calculatedCount === 0) {
      console.error('❌ No currency pairs calculated');
      throw new Error('Failed to calculate any currency pairs');
    }

    // Only clean old data for specific symbols to avoid deleting too much
    console.log('🧹 Starting selective database cleanup...');
    const symbolsToClean = Object.keys(marketData);
    
    for (const symbol of symbolsToClean.slice(0, 5)) { // Only clean first 5 to reduce load
      try {
        const cutoffTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // Keep last 10 minutes
        const { error: deleteError } = await supabase
          .from('live_market_data')
          .delete()
          .eq('symbol', symbol)
          .lt('created_at', cutoffTime);
            
        if (!deleteError) {
          console.log(`✅ Cleaned old records for ${symbol}`);
        }
      } catch (error) {
        console.error(`❌ Error during cleanup for ${symbol}:`, error);
      }
    }

    // Process and store the market data
    console.log('💾 Processing market data for database insertion...');
    const marketDataBatch = [];

    for (const [symbol, rate] of Object.entries(marketData)) {
      try {
        const price = parseFloat(rate.toString());
        
        if (isNaN(price) || price <= 0) {
          console.warn(`❌ Invalid price for ${symbol}: ${rate}`);
          continue;
        }
        
        // Calculate realistic bid/ask spread
        const spread = price * (symbol.includes('JPY') ? 0.002 : 0.00002);
        const bid = parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));
        const ask = parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));

        const recordData = {
          symbol,
          price: parseFloat(price.toFixed(symbol.includes('JPY') ? 3 : 5)),
          bid,
          ask,
          source: dataSource,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        marketDataBatch.push(recordData);
        console.log(`✅ Prepared ${symbol} for insertion: ${price.toFixed(5)}`);
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
        continue;
      }
    }

    console.log(`📊 Processed ${marketDataBatch.length} currency pairs from ${dataSource} source`);
    console.log(`💾 Batch size for insertion: ${marketDataBatch.length} records`);

    if (marketDataBatch.length === 0) {
      console.error('❌ No valid market data processed');
      throw new Error('No valid market data processed');
    }

    // Insert new market data
    console.log('🚀 Starting database insertion...');
    
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('live_market_data')
        .insert(marketDataBatch)
        .select();

      if (insertError) {
        console.error('❌ Database insertion failed:', insertError);
        throw new Error(`Database insertion failed: ${insertError.message}`);
      }

      console.log('✅ Database insertion successful!');
      console.log(`   - Records inserted: ${insertData ? insertData.length : marketDataBatch.length}`);
      
      const responseData = { 
        success: true, 
        message: `Updated ${marketDataBatch.length} currency pairs including cross-pairs`,
        pairs: marketDataBatch.map(item => item.symbol),
        marketOpen: isMarketOpen,
        timestamp: new Date().toISOString(),
        source: dataSource,
        dataType: dataSource === 'fallback' ? 'simulated' : 'real',
        recordsInserted: insertData ? insertData.length : marketDataBatch.length
      };
      
      console.log('🎉 Function completed successfully');
      
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (dbError) {
      console.error('💥 Database operation failed:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR in fetch-market-data function:', error.message);
    
    try {
      console.log('🔄 Attempting demo data generation as fallback...');
      return await generateDemoResponse(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
    } catch (demoError) {
      console.error('💥 Failed to generate demo data:', demoError);
      return new Response(
        JSON.stringify({ 
          error: error.message,
          fallbackFailed: demoError.message,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  }
});

async function generateDemoResponse(supabaseUrl: string, supabaseServiceKey: string) {
  console.log('🎭 === GENERATING DEMO DATA ===');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const demoData = {
    'EURUSD': 1.08500, 'GBPUSD': 1.26500, 'USDJPY': 148.500, 'USDCHF': 0.89200,
    'AUDUSD': 0.67200, 'USDCAD': 1.35800, 'NZDUSD': 0.62100, 'EURGBP': 0.85900,
    'EURJPY': 161.200, 'GBPJPY': 187.800, 'EURCHF': 0.96800, 'GBPCHF': 1.12900,
    'AUDCHF': 0.59900, 'CADJPY': 109.400, 'CHFJPY': 166.500, 'EURAUD': 1.61500,
    'EURNZD': 1.74800, 'EURCAD': 1.47300, 'GBPAUD': 1.88200, 'GBPNZD': 2.03600,
    'GBPCAD': 1.71700, 'AUDNZD': 1.08200, 'AUDCAD': 0.91200, 'NZDCAD': 0.84300,
    'AUDSGD': 0.90400, 'NZDCHF': 0.55400, 'USDNOK': 10.89000, 'USDSEK': 10.45000
  };
  
  const marketDataBatch = [];
  
  for (const [symbol, price] of Object.entries(demoData)) {
    const variation = (Math.random() - 0.5) * 0.001;
    const adjustedPrice = price + (price * variation);
    
    const spread = adjustedPrice * (symbol.includes('JPY') ? 0.002 : 0.00002);
    const bid = parseFloat((adjustedPrice - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));
    const ask = parseFloat((adjustedPrice + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));

    marketDataBatch.push({
      symbol,
      price: parseFloat(adjustedPrice.toFixed(symbol.includes('JPY') ? 3 : 5)),
      bid,
      ask,
      source: 'demo',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  }
  
  const { data: insertData, error: insertError } = await supabase
    .from('live_market_data')
    .insert(marketDataBatch)
    .select();

  if (insertError) {
    throw new Error(`Failed to insert demo data: ${insertError.message}`);
  }

  console.log(`✅ Successfully inserted ${insertData ? insertData.length : marketDataBatch.length} demo records`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Updated ${marketDataBatch.length} currency pairs with demo data including cross-pairs`,
      pairs: marketDataBatch.map(item => item.symbol),
      marketOpen: true,
      timestamp: new Date().toISOString(),
      source: 'demo',
      dataType: 'demo',
      recordsInserted: insertData ? insertData.length : marketDataBatch.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
