
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
    console.log('🔧 Getting environment variables...');
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

    console.log(`📊 Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`);

    // All pairs that we need to support
    const requiredPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY', 
      'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD', 'GBPAUD', 'GBPNZD', 'GBPCAD', 
      'AUDNZD', 'AUDCAD', 'NZDCAD', 'AUDSGD', 'NZDCHF', 'USDNOK', 'USDSEK'
    ];

    console.log(`💱 Will calculate ${requiredPairs.length} currency pairs`);

    let baseRates: Record<string, number> = {};
    let dataSource = 'unknown';
    
    try {
      const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'NOK', 'SEK', 'SGD'];
      const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${currencies.join(',')}&api_key=${fastForexApiKey}`;
      
      console.log('🌐 Calling FastForex API...');
      
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
      console.log('📋 Raw API response:', JSON.stringify(data, null, 2));
      
      if (data.results && typeof data.results === 'object') {
        console.log('✅ Processing USD-based rates...');
        baseRates = { USD: 1, ...data.results };
        dataSource = 'fastforex-api';
        console.log('💾 Base rates obtained:', Object.keys(baseRates));
      } else {
        console.error('❌ No results in API response');
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('❌ FastForex API error:', error.message);
      throw error; // Don't use fallback data - fail if no real data
    }

    // Clean old data more conservatively
    console.log('🧹 Cleaning old market data...');
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { error: deleteError } = await supabase
        .from('live_market_data')
        .delete()
        .lt('created_at', oneHourAgo);
        
      if (deleteError) {
        console.warn('⚠️ Cleanup warning:', deleteError);
      } else {
        console.log('✅ Cleaned old records');
      }
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error);
    }

    // Calculate all currency pairs
    console.log('🧮 Calculating currency pairs...');
    const marketData: Record<string, number> = {};
    let calculatedCount = 0;

    for (const pair of requiredPairs) {
      try {
        const baseCurrency = pair.substring(0, 3);
        const quoteCurrency = pair.substring(3, 6);
        
        if (baseRates[baseCurrency] && baseRates[quoteCurrency]) {
          const rate = baseRates[quoteCurrency] / baseRates[baseCurrency];
          marketData[pair] = rate;
          calculatedCount++;
          console.log(`✅ ${pair}: ${rate.toFixed(5)}`);
        } else {
          console.warn(`⚠️ Missing rates for ${pair}`);
        }
      } catch (error) {
        console.error(`❌ Error calculating ${pair}:`, error);
        continue;
      }
    }

    console.log(`📊 Calculated ${calculatedCount}/${requiredPairs.length} pairs`);

    if (calculatedCount === 0) {
      throw new Error('No currency pairs calculated');
    }

    // Prepare market data for insertion with transaction
    console.log('💾 Preparing market data batch...');
    const marketDataBatch = [];
    const timestamp = new Date().toISOString();

    for (const [symbol, rate] of Object.entries(marketData)) {
      const price = parseFloat(rate.toString());
      
      if (isNaN(price) || price <= 0) {
        console.warn(`❌ Invalid price for ${symbol}: ${rate}`);
        continue;
      }
      
      const spread = price * (symbol.includes('JPY') ? 0.002 : 0.00002);
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
    }

    console.log(`📊 Prepared ${marketDataBatch.length} records for insertion`);

    if (marketDataBatch.length === 0) {
      throw new Error('No valid market data to insert');
    }

    // Insert with explicit transaction and verification
    console.log('🚀 Starting database transaction...');
    
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
    
    // Immediate verification
    console.log('🔍 Verifying data availability...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('live_market_data')
      .select('symbol, price, created_at')
      .eq('timestamp', timestamp)
      .limit(5);
      
    if (verifyError) {
      console.error('⚠️ Verification failed:', verifyError);
    } else {
      console.log('✅ Verification successful:', verifyData?.length || 0, 'records found');
    }
    
    // Wait a moment for database consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const responseData = { 
      success: true, 
      message: `Updated ${marketDataBatch.length} currency pairs with real-time data`,
      pairs: marketDataBatch.map(item => item.symbol),
      marketOpen: isMarketOpen,
      timestamp,
      source: dataSource,
      dataType: 'real-time',
      recordsInserted: insertData?.length || marketDataBatch.length,
      verificationCount: verifyData?.length || 0
    };
    
    console.log('🎉 Function completed successfully');
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
