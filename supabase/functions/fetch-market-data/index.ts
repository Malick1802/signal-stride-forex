
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
    console.log('🔧 Initializing Tiingo market data fetch...');
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

    // Currency pairs supported by Tiingo
    const supportedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY', 
      'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD', 'GBPAUD', 'GBPNZD', 'GBPCAD', 
      'AUDNZD', 'AUDCAD', 'NZDCAD', 'AUDSGD', 'NZDCHF', 'USDNOK', 'USDSEK'
    ];

    console.log(`💱 Fetching Tiingo forex data for ${supportedPairs.length} currency pairs...`);

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

    const marketData: Record<string, any> = {};
    let successfulPairs = 0;
    const failedPairs: string[] = [];

    // Process pairs in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < supportedPairs.length; i += batchSize) {
      const batch = supportedPairs.slice(i, i + batchSize);
      
      await Promise.allSettled(batch.map(async (pair) => {
        try {
          // Convert pair format for Tiingo (e.g., EURUSD -> eurusd)
          const tiingoPair = pair.toLowerCase();
          const tiingoUrl = `https://api.tiingo.com/tiingo/fx/${tiingoPair}/top?token=${tiingoApiKey}`;
          
          console.log(`📡 Fetching ${pair} from Tiingo...`);
          
          const response = await fetch(tiingoUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'ForexSignalApp/2.0',
              'Authorization': `Token ${tiingoApiKey}`
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Tiingo API error for ${pair}: ${response.status} - ${errorText}`);
            failedPairs.push(pair);
            return;
          }
          
          const data = await response.json();
          console.log(`📋 Tiingo response for ${pair}:`, JSON.stringify(data).substring(0, 200));
          
          if (Array.isArray(data) && data.length > 0) {
            const tickerData = data[0];
            
            // Extract price data from Tiingo response
            const midPrice = tickerData.midPrice || tickerData.close || tickerData.last;
            const bidPrice = tickerData.bidPrice || (midPrice * 0.9999); // Fallback with small spread
            const askPrice = tickerData.askPrice || (midPrice * 1.0001); // Fallback with small spread
            
            if (midPrice && typeof midPrice === 'number' && midPrice > 0) {
              marketData[pair] = {
                price: midPrice,
                bid: bidPrice,
                ask: askPrice,
                timestamp: tickerData.timestamp || new Date().toISOString(),
                source: 'tiingo-api'
              };
              successfulPairs++;
              console.log(`✅ ${pair}: ${midPrice.toFixed(5)} (bid: ${bidPrice.toFixed(5)}, ask: ${askPrice.toFixed(5)})`);
            } else {
              console.warn(`⚠️ Invalid price data for ${pair}:`, tickerData);
              failedPairs.push(pair);
            }
          } else {
            console.warn(`⚠️ No data returned for ${pair}`);
            failedPairs.push(pair);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${pair}:`, error.message);
          failedPairs.push(pair);
        }
      }));
      
      // Rate limiting - wait between batches
      if (i + batchSize < supportedPairs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 Successfully fetched ${successfulPairs}/${supportedPairs.length} pairs from Tiingo`);
    if (failedPairs.length > 0) {
      console.log(`⚠️ Failed pairs: ${failedPairs.join(', ')}`);
    }

    if (successfulPairs === 0) {
      throw new Error('No currency pairs could be fetched from Tiingo');
    }

    // Prepare market data for insertion
    console.log('💾 Preparing Tiingo market data for database insertion...');
    const marketDataBatch = [];
    const timestamp = new Date().toISOString();

    for (const [symbol, data] of Object.entries(marketData)) {
      try {
        const price = parseFloat(data.price.toString());
        const bid = parseFloat(data.bid.toString());
        const ask = parseFloat(data.ask.toString());
        
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
      } catch (error) {
        console.error(`❌ Error preparing data for ${symbol}:`, error);
      }
    }

    console.log(`📊 Prepared ${marketDataBatch.length} Tiingo records for database insertion`);

    if (marketDataBatch.length === 0) {
      throw new Error('No valid Tiingo market data to insert');
    }

    // Insert with explicit error handling
    console.log('🚀 Inserting Tiingo data into database...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('live_market_data')
      .insert(marketDataBatch)
      .select('symbol, price, created_at');

    if (insertError) {
      console.error('❌ Database insertion failed:', insertError);
      throw new Error(`Database insertion failed: ${insertError.message}`);
    }

    console.log('✅ Tiingo database insertion successful!');
    console.log(`📊 Records inserted: ${insertData?.length || 0}`);
    
    // Enhanced verification
    console.log('🔍 Verifying Tiingo data availability...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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

    // Trigger signal generation after successful market data fetch
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
      message: `Updated ${marketDataBatch.length} currency pairs with Tiingo real-time data and triggered signal generation`,
      pairs: marketDataBatch.map(item => item.symbol),
      marketOpen: isMarketOpen,
      timestamp,
      source: 'tiingo-api',
      dataType: 'real-time',
      recordsInserted: insertData?.length || marketDataBatch.length,
      verificationCount: verifyData?.length || 0,
      successfulPairs,
      failedPairs: failedPairs.length,
      signalGenerationTriggered: true
    };
    
    console.log('🎉 Tiingo integration completed successfully with signal generation');
    console.log(`📊 Final stats: ${successfulPairs} successful, ${marketDataBatch.length} inserted, ${verifyData?.length || 0} verified`);
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR in Tiingo market data fetch:', error.message);
    console.error('📍 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'fetch-market-data-tiingo'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
