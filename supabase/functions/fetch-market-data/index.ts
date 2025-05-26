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
      throw new Error('FastForex API key not configured');
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

    // Try multiple FastForex endpoints to ensure we get data
    let marketData = null;
    let dataSource = 'unknown';
    
    // First try: fetch-all endpoint
    try {
      const fetchAllUrl = `https://api.fastforex.io/fetch-all?api_key=${fastForexApiKey}`;
      console.log('Trying fetch-all endpoint...');
      
      const response = await fetch(fetchAllUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ForexSignalApp/1.0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('FastForex fetch-all response received:', Object.keys(data));
        
        if (data.results && typeof data.results === 'object') {
          marketData = data.results;
          dataSource = 'fetch-all';
          console.log(`Successfully got data from fetch-all endpoint with ${Object.keys(marketData).length} pairs`);
        }
      } else {
        console.log(`fetch-all endpoint failed with status: ${response.status}`);
      }
    } catch (error) {
      console.log('fetch-all endpoint error:', error.message);
    }

    // Second try: fetch-multi endpoint if fetch-all failed
    if (!marketData) {
      try {
        const symbols = supportedPairs.join(',');
        const fetchMultiUrl = `https://api.fastforex.io/fetch-multi?from=USD&to=${symbols}&api_key=${fastForexApiKey}`;
        console.log('Trying fetch-multi endpoint...');
        
        const response = await fetch(fetchMultiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ForexSignalApp/1.0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('FastForex fetch-multi response received:', Object.keys(data));
          
          if (data.results && typeof data.results === 'object') {
            marketData = data.results;
            dataSource = 'fetch-multi';
            console.log(`Successfully got data from fetch-multi endpoint with ${Object.keys(marketData).length} pairs`);
          }
        } else {
          console.log(`fetch-multi endpoint failed with status: ${response.status}`);
        }
      } catch (error) {
        console.log('fetch-multi endpoint error:', error.message);
      }
    }

    // If no real data available, generate realistic fallback data
    if (!marketData || Object.keys(marketData).length === 0) {
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
      
      marketData = {};
      supportedPairs.forEach(pair => {
        const basePrice = basePrices[pair] || 1.0000;
        // Add small random variation (±0.1%)
        const variation = (Math.random() - 0.5) * 0.002;
        marketData[pair] = basePrice + (basePrice * variation);
      });
      
      dataSource = 'fallback';
    }

    // Process and store the market data
    const marketDataBatch = [];
    let processedCount = 0;

    for (const [symbol, rate] of Object.entries(marketData)) {
      // Skip if not in our supported pairs
      if (!supportedPairs.includes(symbol)) {
        continue;
      }
      
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
    }

    console.log(`Processed ${processedCount} forex pairs from ${dataSource}`);

    if (marketDataBatch.length === 0) {
      throw new Error('No valid market data processed after all attempts');
    }

    // Clean old data efficiently (keep only last 50 records per symbol)
    const symbolsToClean = [...new Set(marketDataBatch.map(item => item.symbol))];
    
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
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
