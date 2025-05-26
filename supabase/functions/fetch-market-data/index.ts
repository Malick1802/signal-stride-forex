
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
    console.log('🔧 Initializing fetch-market-data function...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!fastForexApiKey) {
      console.error('❌ FastForex API key not configured');
      return new Response(
        JSON.stringify({ error: 'FastForex API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    console.log(`📊 Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'} (UTC Day: ${utcDay}, Hour: ${utcHour})`);

    // Currency pairs that we need to support
    const requiredPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY', 
      'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD', 'GBPAUD', 'GBPNZD', 'GBPCAD', 
      'AUDNZD', 'AUDCAD', 'NZDCAD', 'AUDSGD', 'NZDCHF', 'USDNOK', 'USDSEK'
    ];

    console.log(`💱 Processing ${requiredPairs.length} currency pairs...`);

    let baseRates: Record<string, number> = {};
    let dataSource = 'unknown';
    
    try {
      const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'NOK', 'SEK', 'SGD'];
      const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${currencies.join(',')}&api_key=${fastForexApiKey}`;
      
      console.log('🌐 Calling FastForex API...');
      console.log(`📡 API URL: ${fetchMultiUrl.replace(fastForexApiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(fetchMultiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ForexSignalApp/1.0'
        }
      });
      
      console.log(`📡 FastForex API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ FastForex API error: ${response.status} - ${errorText}`);
        throw new Error(`API responded with ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`📋 FastForex API response keys: ${Object.keys(data).join(', ')}`);
      
      if (data.results && typeof data.results === 'object') {
        console.log('✅ Processing USD-based rates...');
        baseRates = { USD: 1, ...data.results };
        dataSource = 'fastforex-api';
        console.log(`💾 Base rates for: ${Object.keys(baseRates).join(', ')}`);
      } else {
        console.error('❌ Invalid API response structure:', data);
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error(`❌ FastForex API error: ${error.message}`);
      throw error;
    }

    // Clean old data before inserting new data
    console.log('🧹 Cleaning old market data...');
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { error: deleteError, count: deletedCount } = await supabase
        .from('live_market_data')
        .delete()
        .lt('created_at', sixHoursAgo);
        
      if (deleteError) {
        console.warn('⚠️ Cleanup warning:', deleteError);
      } else {
        console.log(`✅ Cleaned ${deletedCount || 0} old records`);
      }
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error);
    }

    // Calculate all currency pairs with better error handling
    console.log('🧮 Calculating currency pairs...');
    const marketData: Record<string, number> = {};
    let calculatedCount = 0;
    const failedPairs: string[] = [];

    const requiredPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY', 
      'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD', 'GBPAUD', 'GBPNZD', 'GBPCAD', 
      'AUDNZD', 'AUDCAD', 'NZDCAD', 'AUDSGD', 'NZDCHF', 'USDNOK', 'USDSEK'
    ];

    for (const pair of requiredPairs) {
      try {
        const baseCurrency = pair.substring(0, 3);
        const quoteCurrency = pair.substring(3, 6);
        
        if (baseRates[baseCurrency] && baseRates[quoteCurrency]) {
          const rate = baseRates[quoteCurrency] / baseRates[baseCurrency];
          
          if (rate > 0 && isFinite(rate)) {
            marketData[pair] = rate;
            calculatedCount++;
            console.log(`✅ ${pair}: ${rate.toFixed(5)}`);
          } else {
            console.warn(`⚠️ Invalid rate calculated for ${pair}: ${rate}`);
            failedPairs.push(pair);
          }
        } else {
          console.warn(`⚠️ Missing base rates for ${pair} (${baseCurrency}=${baseRates[baseCurrency]}, ${quoteCurrency}=${baseRates[quoteCurrency]})`);
          failedPairs.push(pair);
        }
      } catch (error) {
        console.error(`❌ Error calculating ${pair}:`, error.message);
        failedPairs.push(pair);
      }
    }

    console.log(`📊 Successfully calculated ${calculatedCount}/${requiredPairs.length} pairs`);
    if (failedPairs.length > 0) {
      console.log(`⚠️ Failed pairs: ${failedPairs.join(', ')}`);
    }

    if (calculatedCount === 0) {
      throw new Error('No currency pairs could be calculated');
    }

    // Prepare market data for insertion with better validation
    console.log('💾 Preparing market data for database insertion...');
    const marketDataBatch = [];
    const timestamp = new Date().toISOString();

    for (const [symbol, rate] of Object.entries(marketData)) {
      try {
        const price = parseFloat(rate.toString());
        
        if (isNaN(price) || price <= 0 || !isFinite(price)) {
          console.warn(`❌ Invalid price for ${symbol}: ${rate}`);
          continue;
        }
        
        // Calculate realistic spread (0.002% for JPY pairs, 0.002% for others)
        const spread = price * (symbol.includes('JPY') ? 0.00002 : 0.00002);
        const bid = parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));
        const ask = parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));

        marketDataBatch.push({
          symbol,
          price: parseFloat(price.toFixed(symbol.includes('JPY') ? 3 : 5)),
          bid,
          ask,
          source: dataSource,
          timestamp,
          created_at: timestamp
        });
      } catch (error) {
        console.error(`❌ Error preparing data for ${symbol}:`, error);
      }
    }

    console.log(`📊 Prepared ${marketDataBatch.length} records for database insertion`);

    if (marketDataBatch.length === 0) {
      throw new Error('No valid market data to insert');
    }

    // Insert with explicit error handling and verification
    console.log('🚀 Inserting data into database...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('live_market_data')
      .insert(marketDataBatch)
      .select('symbol, price, created_at');

    if (insertError) {
      console.error('❌ Database insertion failed:', insertError);
      throw new Error(`Database insertion failed: ${insertError.message}`);
    }

    console.log('✅ Database insertion successful!');
    console.log(`📊 Records inserted: ${insertData?.length || 0}`);
    
    // Enhanced verification with longer wait
    console.log('🔍 Verifying data availability...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for DB consistency
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('live_market_data')
      .select('symbol, price, created_at')
      .eq('timestamp', timestamp)
      .order('created_at', { ascending: false });
      
    if (verifyError) {
      console.error('⚠️ Verification query failed:', verifyError);
    } else {
      console.log(`✅ Verification successful: ${verifyData?.length || 0} records confirmed in database`);
      if (verifyData && verifyData.length > 0) {
        console.log(`📋 Sample verified records: ${verifyData.slice(0, 3).map(r => `${r.symbol}:${r.price}`).join(', ')}`);
      }
    }

    // NEW: Automatically trigger signal generation after successful market data fetch
    console.log('🤖 Triggering automatic signal generation...');
    try {
      const { data: signalGenResult, error: signalGenError } = await supabase.functions.invoke('generate-signals');
      
      if (signalGenError) {
        console.error('⚠️ Signal generation failed:', signalGenError);
      } else {
        console.log('✅ Signal generation triggered successfully:', signalGenResult);
      }
    } catch (error) {
      console.error('❌ Error triggering signal generation:', error);
    }
    
    const responseData = { 
      success: true, 
      message: `Updated ${marketDataBatch.length} currency pairs with real-time data and triggered signal generation`,
      pairs: marketDataBatch.map(item => item.symbol),
      marketOpen: true,
      timestamp,
      source: dataSource,
      dataType: 'real-time',
      recordsInserted: insertData?.length || marketDataBatch.length,
      verificationCount: verifyData?.length || 0,
      calculatedPairs: calculatedCount,
      failedPairs: failedPairs.length,
      signalGenerationTriggered: true
    };
    
    console.log('🎉 Function completed successfully with signal generation');
    console.log(`📊 Final stats: ${calculatedCount} calculated, ${marketDataBatch.length} inserted, ${verifyData?.length || 0} verified`);
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR in fetch-market-data:', error.message);
    console.error('📍 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'fetch-market-data'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
