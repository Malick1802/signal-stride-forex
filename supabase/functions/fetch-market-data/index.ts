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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY')!;
    
    if (!fastForexApiKey) {
      console.log('FastForex API key not configured, using demo data');
      return generateDemoResponse(supabaseUrl, supabaseServiceKey);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting market data fetch from FastForex...');

    // Check if forex markets are open
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                        (utcDay === 0 && utcHour >= 22) || 
                        (utcDay === 5 && utcHour < 22);

    console.log(`Market status: ${isMarketOpen ? 'OPEN' : 'CLOSED'} (Day: ${utcDay}, Hour: ${utcHour})`);

    // Major forex pairs that we support
    const supportedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
      'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF',
      'AUDCHF', 'CADJPY', 'CHFJPY', 'EURAUD', 'EURNZD', 'EURCAD',
      'GBPAUD', 'GBPNZD', 'GBPCAD', 'AUDNZD', 'AUDCAD', 'NZDCAD',
      'AUDSGD', 'NZDCHF', 'USDNOK', 'USDSEK'
    ];

    console.log(`Fetching real market data for ${supportedPairs.length} currency pairs from FastForex`);

    let marketData: Record<string, number> = {};
    let dataSource = 'unknown';
    
    // Try the fetch-multi endpoint for USD pairs
    try {
      const currencies = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'NOK', 'SEK'];
      const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${currencies.join(',')}&api_key=${fastForexApiKey}`;
      console.log('Calling FastForex fetch-multi endpoint...');
      
      const response = await fetch(fetchMultiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ForexSignalApp/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`FastForex API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`API responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log('FastForex API response structure:', Object.keys(data));
      console.log('Full response:', JSON.stringify(data, null, 2));
      
      if (data.results && typeof data.results === 'object') {
        console.log('Processing USD-based rates...');
        
        // Process USD-based rates (like USDEUR, USDJPY, etc.)
        for (const [currency, rate] of Object.entries(data.results)) {
          if (typeof rate === 'number' && rate > 0) {
            const usdPair = `USD${currency}`;
            if (supportedPairs.includes(usdPair)) {
              marketData[usdPair] = rate;
              console.log(`Added ${usdPair}: ${rate}`);
            }
            
            // Calculate inverse pairs (like EURUSD from USDEUR)
            const inversePair = `${currency}USD`;
            if (supportedPairs.includes(inversePair)) {
              marketData[inversePair] = 1 / rate;
              console.log(`Added ${inversePair}: ${1 / rate}`);
            }
          }
        }
        
        dataSource = 'fetch-multi-usd';
        console.log(`Successfully processed ${Object.keys(marketData).length} USD-based pairs`);
      }
    } catch (error) {
      console.error('fetch-multi USD endpoint error:', error.message);
    }

    // Try additional major pairs if we need more data
    if (Object.keys(marketData).length < 10) {
      try {
        const fetchOneUrl = `https://api.fastforex.io/fetch-one?from=EUR&to=USD&api_key=${fastForexApiKey}`;
        console.log('Trying single pair fetch for EURUSD...');
        
        const response = await fetch(fetchOneUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ForexSignalApp/1.0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Single pair response:', data);
          
          if (data.result && typeof data.result.USD === 'number') {
            marketData['EURUSD'] = data.result.USD;
            console.log(`Added EURUSD from single fetch: ${data.result.USD}`);
            dataSource = dataSource === 'unknown' ? 'fetch-one' : dataSource + '+fetch-one';
          }
        }
      } catch (error) {
        console.error('Single pair fetch error:', error.message);
      }
    }

    // If no real data available, generate realistic fallback data
    if (Object.keys(marketData).length === 0) {
      console.log('No real data available, generating realistic fallback data');
      
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
    }

    // Clean old data efficiently (keep only last 50 records per symbol)
    const symbolsToClean = Object.keys(marketData);
    
    for (const symbol of symbolsToClean) {
      const { data: oldRecords } = await supabase
        .from('live_market_data')
        .select('id')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .range(50, 1000);
      
      if (oldRecords && oldRecords.length > 0) {
        const idsToDelete = oldRecords.map(r => r.id);
        const { error: deleteError } = await supabase
          .from('live_market_data')
          .delete()
          .in('id', idsToDelete);
          
        if (deleteError) {
          console.warn(`Warning: Could not clean old data for ${symbol}:`, deleteError);
        }
      }
    }

    // Process and store the market data
    const marketDataBatch = [];
    let processedCount = 0;

    for (const [symbol, rate] of Object.entries(marketData)) {
      try {
        const price = parseFloat(rate.toString());
        
        if (isNaN(price) || price <= 0) {
          console.warn(`Invalid price for ${symbol}: ${rate}`);
          continue;
        }
        
        // Calculate realistic bid/ask spread
        const spread = price * (symbol.includes('JPY') ? 0.002 : 0.00002);
        const bid = parseFloat((price - spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));
        const ask = parseFloat((price + spread/2).toFixed(symbol.includes('JPY') ? 3 : 5));

        marketDataBatch.push({
          symbol,
          price: parseFloat(price.toFixed(symbol.includes('JPY') ? 3 : 5)),
          bid,
          ask,
          source: dataSource,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        
        processedCount++;
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        continue;
      }
    }

    console.log(`Processed ${processedCount} forex pairs from ${dataSource}`);

    if (marketDataBatch.length === 0) {
      throw new Error('No valid market data processed after all attempts');
    }

    // Insert new market data
    const { error: insertError } = await supabase
      .from('live_market_data')
      .insert(marketDataBatch);

    if (insertError) {
      console.error('Error inserting market data:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert market data', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully inserted ${marketDataBatch.length} market data records from ${dataSource}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${marketDataBatch.length} currency pairs with ${dataSource} data`,
        pairs: marketDataBatch.map(item => item.symbol),
        marketOpen: isMarketOpen,
        timestamp: new Date().toISOString(),
        source: dataSource,
        dataType: dataSource === 'fallback' ? 'simulated' : 'real'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-market-data function:', error);
    
    // If there's an error, try to generate demo data as last resort
    try {
      return await generateDemoResponse(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
    } catch (demoError) {
      console.error('Failed to generate demo data:', demoError);
      return new Response(
        JSON.stringify({ 
          error: error.message,
          fallbackFailed: demoError.message
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
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('Generating demo market data...');
  
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
  }
  
  // Insert demo data
  const { error: insertError } = await supabase
    .from('live_market_data')
    .insert(marketDataBatch);

  if (insertError) {
    throw new Error(`Failed to insert demo data: ${insertError.message}`);
  }

  console.log(`Successfully inserted ${marketDataBatch.length} demo market data records`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Updated ${marketDataBatch.length} currency pairs with demo data`,
      pairs: marketDataBatch.map(item => item.symbol),
      marketOpen: true,
      timestamp: new Date().toISOString(),
      source: 'demo',
      dataType: 'demo'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
