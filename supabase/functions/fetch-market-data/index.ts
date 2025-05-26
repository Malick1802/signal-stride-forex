
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

    // Major forex pairs that we support
    const supportedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
      'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF',
      'AUDCHF', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD',
      'GBPAUD', 'GBPNZD', 'GBPCAD', 'AUDNZD', 'AUDCAD', 'NZDCAD',
      'AUDSGD', 'NZDCHF', 'USDNOK', 'USDSEK'
    ];

    console.log(`💱 Will attempt to fetch ${supportedPairs.length} currency pairs`);
    console.log('Supported pairs:', supportedPairs.join(', '));

    let marketData: Record<string, number> = {};
    let dataSource = 'unknown';
    
    // Try the fetch-multi endpoint for USD pairs
    try {
      const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'NOK', 'SEK'];
      const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${currencies.join(',')}&api_key=${fastForexApiKey}`;
      
      console.log('🌐 Calling FastForex fetch-multi endpoint...');
      console.log('   URL:', fetchMultiUrl.replace(fastForexApiKey, 'HIDDEN_API_KEY'));
      console.log('   Target currencies:', currencies.join(', '));
      
      const response = await fetch(fetchMultiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ForexSignalApp/1.0'
        }
      });
      
      console.log('📡 FastForex API response received:');
      console.log('   - Status:', response.status);
      console.log('   - Status Text:', response.statusText);
      console.log('   - Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FastForex API error:');
        console.error('   - Status:', response.status);
        console.error('   - Response:', errorText);
        throw new Error(`API responded with ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📋 Raw API response data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.results && typeof data.results === 'object') {
        console.log('✅ Processing USD-based rates...');
        console.log('Available results keys:', Object.keys(data.results));
        
        // Process USD-based rates (like USDEUR, USDJPY, etc.)
        for (const [currency, rate] of Object.entries(data.results)) {
          console.log(`🔄 Processing ${currency}: ${rate}`);
          
          if (typeof rate === 'number' && rate > 0) {
            const usdPair = `USD${currency}`;
            if (supportedPairs.includes(usdPair)) {
              marketData[usdPair] = rate;
              console.log(`✅ Added ${usdPair}: ${rate}`);
            } else {
              console.log(`⚠️ ${usdPair} not in supported pairs list`);
            }
            
            // Calculate inverse pairs (like EURUSD from USDEUR)
            const inversePair = `${currency}USD`;
            if (supportedPairs.includes(inversePair)) {
              const inverseRate = 1 / rate;
              marketData[inversePair] = inverseRate;
              console.log(`✅ Added ${inversePair}: ${inverseRate} (inverse of ${rate})`);
            } else {
              console.log(`⚠️ ${inversePair} not in supported pairs list`);
            }
          } else {
            console.log(`❌ Invalid rate for ${currency}: ${rate} (type: ${typeof rate})`);
          }
        }
        
        dataSource = 'fetch-multi-usd';
        console.log(`📊 Successfully processed ${Object.keys(marketData).length} USD-based pairs`);
      } else {
        console.error('❌ No results object found in API response');
        console.error('Response structure:', Object.keys(data));
      }
    } catch (error) {
      console.error('❌ fetch-multi USD endpoint error:');
      console.error('   - Error type:', error.constructor.name);
      console.error('   - Error message:', error.message);
      console.error('   - Error stack:', error.stack);
    }

    // Try additional major pairs if we need more data
    if (Object.keys(marketData).length < 10) {
      console.log('📈 Need more data, trying single pair fetch for EURUSD...');
      
      try {
        const fetchOneUrl = `https://api.fastforex.io/fetch-one?from=EUR&to=USD&api_key=${fastForexApiKey}`;
        console.log('🌐 Calling single pair endpoint:', fetchOneUrl.replace(fastForexApiKey, 'HIDDEN_API_KEY'));
        
        const response = await fetch(fetchOneUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ForexSignalApp/1.0'
          }
        });
        
        console.log('📡 Single pair response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Single pair response data:', JSON.stringify(data, null, 2));
          
          if (data.result && typeof data.result.USD === 'number') {
            marketData['EURUSD'] = data.result.USD;
            console.log(`✅ Added EURUSD from single fetch: ${data.result.USD}`);
            dataSource = dataSource === 'unknown' ? 'fetch-one' : dataSource + '+fetch-one';
          } else {
            console.error('❌ Invalid single pair response structure');
          }
        } else {
          const errorText = await response.text();
          console.error('❌ Single pair fetch failed:', response.status, errorText);
        }
      } catch (error) {
        console.error('❌ Single pair fetch error:', error.message);
      }
    }

    // If no real data available, generate realistic fallback data
    if (Object.keys(marketData).length === 0) {
      console.log('⚠️ No real data available, generating realistic fallback data');
      
      const basePrices = {
        'EURUSD': 1.08500, 'GBPUSD': 1.26500, 'USDJPY': 148.500, 'USDCHF': 0.89200,
        'AUDUSD': 0.67200, 'USDCAD': 1.35800, 'NZDUSD': 0.62100, 'EURGBP': 0.85900,
        'EURJPY': 161.200, 'GBPJPY': 187.800, 'EURCHF': 0.96800, 'GBPCHF': 1.12900,
        'AUDCHF': 0.59900, 'CADJPY': 109.400, 'CHFJPY': 166.500, 'EURAUD': 1.61500,
        'EURNZD': 1.74800, 'EURCAD': 1.47300, 'GBPAUD': 1.88200, 'GBPNZD': 2.03600,
        'GBPCAD': 1.71700, 'AUDNZD': 1.08200, 'AUDCAD': 0.91200, 'NZDCAD': 0.84300,
        'AUDSGD': 0.90400, 'NZDCHF': 0.55400, 'USDNOK': 10.89000, 'USDSEK': 10.45000
      };
      
      supportedPairs.forEach(pair => {
        const basePrice = basePrices[pair] || 1.0000;
        // Add small random variation (±0.1%)
        const variation = (Math.random() - 0.5) * 0.002;
        marketData[pair] = basePrice + (basePrice * variation);
      });
      
      dataSource = 'fallback';
      console.log(`📊 Generated ${Object.keys(marketData).length} fallback prices`);
    }

    console.log('🧹 Starting database cleanup...');
    // Clean old data efficiently (keep only last 50 records per symbol)
    const symbolsToClean = Object.keys(marketData);
    
    for (const symbol of symbolsToClean) {
      try {
        const { data: oldRecords, error: selectError } = await supabase
          .from('live_market_data')
          .select('id')
          .eq('symbol', symbol)
          .order('created_at', { ascending: false })
          .range(50, 1000);
        
        if (selectError) {
          console.error(`❌ Error selecting old records for ${symbol}:`, selectError);
          continue;
        }
        
        if (oldRecords && oldRecords.length > 0) {
          console.log(`🗑️ Cleaning ${oldRecords.length} old records for ${symbol}`);
          const idsToDelete = oldRecords.map(r => r.id);
          const { error: deleteError } = await supabase
            .from('live_market_data')
            .delete()
            .in('id', idsToDelete);
            
          if (deleteError) {
            console.warn(`⚠️ Warning: Could not clean old data for ${symbol}:`, deleteError);
          } else {
            console.log(`✅ Cleaned ${idsToDelete.length} old records for ${symbol}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error during cleanup for ${symbol}:`, error);
      }
    }

    // Process and store the market data
    console.log('💾 Processing market data for database insertion...');
    const marketDataBatch = [];
    let processedCount = 0;

    for (const [symbol, rate] of Object.entries(marketData)) {
      try {
        console.log(`🔄 Processing ${symbol}: ${rate}`);
        const price = parseFloat(rate.toString());
        
        if (isNaN(price) || price <= 0) {
          console.warn(`❌ Invalid price for ${symbol}: ${rate} -> ${price}`);
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
        console.log(`✅ Prepared ${symbol} for insertion:`, recordData);
        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
        continue;
      }
    }

    console.log(`📊 Processed ${processedCount} forex pairs from ${dataSource} source`);
    console.log(`💾 Batch size for insertion: ${marketDataBatch.length} records`);

    if (marketDataBatch.length === 0) {
      console.error('❌ No valid market data processed after all attempts');
      throw new Error('No valid market data processed after all attempts');
    }

    // Insert new market data with detailed logging
    console.log('🚀 Starting database insertion...');
    console.log('Sample record for insertion:', JSON.stringify(marketDataBatch[0], null, 2));
    
    try {
      console.log('📝 Calling supabase.from(live_market_data).insert()...');
      const { data: insertData, error: insertError } = await supabase
        .from('live_market_data')
        .insert(marketDataBatch)
        .select();

      console.log('📊 Database insertion response received');
      console.log('   - Insert error:', insertError ? JSON.stringify(insertError, null, 2) : 'None');
      console.log('   - Insert data length:', insertData ? insertData.length : 'None');

      if (insertError) {
        console.error('❌ Database insertion failed:');
        console.error('   - Error code:', insertError.code);
        console.error('   - Error message:', insertError.message);
        console.error('   - Error details:', insertError.details);
        console.error('   - Error hint:', insertError.hint);
        
        // Try to insert records one by one to identify problematic records
        console.log('🔍 Attempting individual record insertion to identify issues...');
        let successCount = 0;
        for (let i = 0; i < marketDataBatch.length; i++) {
          try {
            const record = marketDataBatch[i];
            console.log(`🔄 Inserting record ${i + 1}/${marketDataBatch.length}: ${record.symbol}`);
            
            const { error: singleError } = await supabase
              .from('live_market_data')
              .insert([record]);
              
            if (singleError) {
              console.error(`❌ Failed to insert ${record.symbol}:`, singleError);
            } else {
              console.log(`✅ Successfully inserted ${record.symbol}`);
              successCount++;
            }
          } catch (singleInsertError) {
            console.error(`💥 Exception inserting record ${i + 1}:`, singleInsertError);
          }
        }
        
        console.log(`📊 Individual insertion results: ${successCount}/${marketDataBatch.length} successful`);
        
        if (successCount > 0) {
          const responseData = { 
            success: true, 
            message: `Partially updated ${successCount}/${marketDataBatch.length} currency pairs with ${dataSource} data`,
            pairs: marketDataBatch.slice(0, successCount).map(item => item.symbol),
            marketOpen: isMarketOpen,
            timestamp: new Date().toISOString(),
            source: dataSource,
            dataType: dataSource === 'fallback' ? 'simulated' : 'real',
            recordsInserted: successCount,
            warnings: [`Batch insert failed, used individual inserts. ${marketDataBatch.length - successCount} records failed.`]
          };
          
          console.log('⚠️ Partial success response:', responseData);
          return new Response(
            JSON.stringify(responseData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error(`Database insertion completely failed: ${insertError.message}`);
        }
      }

      console.log('✅ Database insertion successful!');
      console.log(`   - Records inserted: ${insertData ? insertData.length : marketDataBatch.length}`);
      console.log(`   - Data source: ${dataSource}`);
      console.log(`   - Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`);
      
      const responseData = { 
        success: true, 
        message: `Updated ${marketDataBatch.length} currency pairs with ${dataSource} data`,
        pairs: marketDataBatch.map(item => item.symbol),
        marketOpen: isMarketOpen,
        timestamp: new Date().toISOString(),
        source: dataSource,
        dataType: dataSource === 'fallback' ? 'simulated' : 'real',
        recordsInserted: insertData ? insertData.length : marketDataBatch.length
      };
      
      console.log('🎉 Function completed successfully:', responseData);
      
      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (dbError) {
      console.error('💥 Database operation exception:');
      console.error('   - Error type:', dbError.constructor.name);
      console.error('   - Error message:', dbError.message);
      console.error('   - Error stack:', dbError.stack);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR in fetch-market-data function:');
    console.error('   - Error type:', error.constructor.name);
    console.error('   - Error message:', error.message);
    console.error('   - Error stack:', error.stack);
    
    // If there's an error, try to generate demo data as last resort
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
  
  console.log('📊 Creating demo market data batch...');
  const marketDataBatch = [];
  
  for (const [symbol, price] of Object.entries(demoData)) {
    // Add small variation to make it look realistic
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
    
    console.log(`📈 Demo data for ${symbol}: ${adjustedPrice.toFixed(5)}`);
  }
  
  // Insert demo data
  console.log('💾 Inserting demo data into database...');
  const { data: insertData, error: insertError } = await supabase
    .from('live_market_data')
    .insert(marketDataBatch)
    .select();

  if (insertError) {
    console.error('❌ Failed to insert demo data:', insertError);
    throw new Error(`Failed to insert demo data: ${insertError.message}`);
  }

  console.log(`✅ Successfully inserted ${insertData ? insertData.length : marketDataBatch.length} demo market data records`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Updated ${marketDataBatch.length} currency pairs with demo data`,
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
