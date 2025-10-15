import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyCandle {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  source: string;
}

// Generate synthetic 4H candles from daily data
function generateSynthetic4HCandles(dailyCandle: DailyCandle): DailyCandle[] {
  const candles: DailyCandle[] = [];
  const baseDate = new Date(dailyCandle.timestamp);
  
  // Create 6 candles per day (4-hour intervals)
  for (let i = 0; i < 6; i++) {
    const candleTime = new Date(baseDate);
    candleTime.setUTCHours(i * 4, 0, 0, 0);
    
    // Distribute the daily range across candles with slight variations
    const progress = (i + 0.5) / 6;
    const range = dailyCandle.high_price - dailyCandle.low_price;
    
    // Simulate intraday movement
    const midPrice = dailyCandle.low_price + (range * progress);
    const variance = range * 0.08;
    
    candles.push({
      symbol: dailyCandle.symbol,
      timeframe: '4H',
      timestamp: candleTime.toISOString(),
      open_price: midPrice - (variance * 0.5),
      high_price: midPrice + variance,
      low_price: midPrice - variance,
      close_price: midPrice + (variance * 0.3),
      volume: 0,
      source: 'synthetic_from_daily'
    });
  }
  
  return candles;
}

// Aggregate daily candles into weekly
function aggregateDailyToWeekly(dailyCandles: DailyCandle[]): DailyCandle[] {
  const weeklyCandles: DailyCandle[] = [];
  const weekMap = new Map<string, DailyCandle[]>();
  
  // Group by week
  dailyCandles.forEach(candle => {
    const date = new Date(candle.timestamp);
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString();
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(candle);
  });
  
  // Aggregate each week
  weekMap.forEach((candles, weekStart) => {
    if (candles.length === 0) return;
    
    weeklyCandles.push({
      symbol: candles[0].symbol,
      timeframe: 'W',
      timestamp: weekStart,
      open_price: candles[0].open_price,
      high_price: Math.max(...candles.map(c => c.high_price)),
      low_price: Math.min(...candles.map(c => c.low_price)),
      close_price: candles[candles.length - 1].close_price,
      volume: candles.reduce((sum, c) => sum + c.volume, 0),
      source: candles[0].source
    });
  });
  
  return weeklyCandles.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// Upsert candles in batches
async function upsertCandles(supabase: any, candles: DailyCandle[]) {
  const batchSize = 500;
  let inserted = 0;
  
  for (let i = 0; i < candles.length; i += batchSize) {
    const batch = candles.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('multi_timeframe_data')
      .upsert(batch, { 
        onConflict: 'symbol,timestamp,timeframe',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`Error upserting batch ${i}-${i + batch.length}:`, error);
      throw error;
    }
    
    inserted += batch.length;
  }
  
  return inserted;
}

// Fetch single year of data using FastForex time-series
async function fetchYearData(
  baseCurrency: string,
  quoteCurrency: string,
  symbol: string,
  fromDate: string,
  toDate: string,
  apiKey: string
): Promise<DailyCandle[]> {
  const url = `https://api.fastforex.io/time-series?from=${baseCurrency}&to=${quoteCurrency}&start=${fromDate}&end=${toDate}`;
  
  console.log(`🔄 Fetching ${symbol}: ${fromDate} to ${toDate}`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey  // ✅ Use header authentication (Tom's confirmed format)
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ FastForex API error: HTTP ${response.status}`, errorText);
    throw new Error(`FastForex API failed: HTTP ${response.status}. Check your API key in Supabase secrets.`);
  }
  
  const data = await response.json();
  
  // Tom confirmed response format: { "base": "EUR", "results": { "2024-10-14": 1.0945 } }
  const resultsObj = data.results || {};
  
  if (!resultsObj || Object.keys(resultsObj).length === 0) {
    console.warn(`⚠️ No data returned for ${fromDate} to ${toDate}`);
    return [];
  }
  
  console.log(`📦 Received ${Object.keys(resultsObj).length} data points`);
  
  // Parse results into candles
  const dailyCandles: DailyCandle[] = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  for (const [dateStr, rates] of Object.entries(resultsObj)) {
    if (!dateRegex.test(dateStr)) continue;
    
    let rateVal: number | null = null;
    
    // Handle response formats:
    // 1. Direct number: { "2024-10-14": 1.0945 }
    // 2. Nested object: { "2024-10-14": { "USD": 1.0945 } }
    if (typeof rates === 'number') {
      rateVal = rates;
    } else if (typeof rates === 'object' && rates !== null) {
      const rateObj = rates as Record<string, any>;
      if (quoteCurrency in rateObj) {
        rateVal = typeof rateObj[quoteCurrency] === 'number' 
          ? rateObj[quoteCurrency] 
          : parseFloat(String(rateObj[quoteCurrency]));
      }
    }
    
    if (!rateVal || isNaN(rateVal) || rateVal <= 0) continue;
    
    // Simulate OHLC from daily close price (FastForex only provides close)
    const spread = rateVal * 0.0015;
    dailyCandles.push({
      symbol,
      timeframe: 'D',
      timestamp: `${dateStr}T00:00:00Z`,
      open_price: rateVal,
      high_price: rateVal + spread,
      low_price: rateVal - spread,
      close_price: rateVal,
      volume: 0,
      source: 'fastforex'
    });
  }
  
  console.log(`✅ Parsed ${dailyCandles.length} candles`);
  return dailyCandles;
}

// Verify API key with Tom's known-good test request
async function verifyApiKey(apiKey: string): Promise<void> {
  console.log('🔐 Verifying FastForex API key...');
  
  // Use Tom's exact working example: EUR/USD for full year 2024
  const testUrl = 'https://api.fastforex.io/time-series?from=EUR&to=USD&start=2024-01-01&end=2024-12-31';
  
  const response = await fetch(testUrl, {
    headers: { 'X-API-Key': apiKey }
  });
  
  if (!response.ok) {
    throw new Error(`API key verification failed: HTTP ${response.status}. Please check FASTFOREX_API_KEY in Supabase secrets.`);
  }
  
  const data = await response.json();
  const resultCount = data.results ? Object.keys(data.results).length : 0;
  
  if (resultCount === 0) {
    throw new Error('API key verification failed: No data returned. Your FastForex plan may not have time-series access enabled.');
  }
  
  console.log(`✅ API key verified (test returned ${resultCount} data points)`);
}

serve(async (req) => {
  console.log('🔄 fetch-historical-data invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fastForexApiKey = Deno.env.get('FASTFOREX_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !fastForexApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ✅ Verify API key first (Tom's recommendation)
    await verifyApiKey(fastForexApiKey);

    const { symbol, timeframe } = await req.json();
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    
    if (!['1D', 'W', '4H'].includes(timeframe)) {
      throw new Error('Timeframe must be 1D, W, or 4H');
    }
    
    console.log(`📊 Fetching ${symbol} ${timeframe} data`);

    const baseCurrency = symbol.substring(0, 3);
    const quoteCurrency = symbol.substring(3, 6);
    
    let dailyCandles: DailyCandle[] = [];
    
    // ✅ Use calendar year boundaries (Tom's recommendation: max 1 year per request)
    if (timeframe === 'W') {
      console.log('📅 Fetching 5 years of data using calendar year boundaries...');
      
      const currentYear = new Date().getFullYear();
      
      for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
        const year = currentYear - yearOffset;
        const fromDate = `${year}-01-01`;
        const toDate = yearOffset === 0 
          ? new Date().toISOString().split('T')[0]  // Current year: fetch up to today
          : `${year}-12-31`;  // Past years: full year
        
        console.log(`📆 Year ${year}: ${fromDate} to ${toDate}`);
        
        try {
          const yearCandles = await fetchYearData(
            baseCurrency, 
            quoteCurrency, 
            symbol, 
            fromDate, 
            toDate, 
            fastForexApiKey
          );
          dailyCandles.push(...yearCandles);
          
          // Rate limiting: 1 second between requests
          if (yearOffset < 4) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error(`❌ Year ${year} failed:`, err.message);
        }
      }
    } else if (timeframe === '1D') {
      // ✅ Daily: Fetch current year + previous year using calendar boundaries
      console.log('📅 Fetching 1D data using calendar year boundaries...');
      
      const currentYear = new Date().getFullYear();
      const today = new Date().toISOString().split('T')[0];
      
      // Request 1: Previous year (full year)
      const prevYear = currentYear - 1;
      console.log(`📆 Fetching ${prevYear}-01-01 to ${prevYear}-12-31`);
      const prevYearCandles = await fetchYearData(
        baseCurrency,
        quoteCurrency,
        symbol,
        `${prevYear}-01-01`,
        `${prevYear}-12-31`,
        fastForexApiKey
      );
      dailyCandles.push(...prevYearCandles);
      
      // Rate limiting between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Request 2: Current year (up to today)
      console.log(`📆 Fetching ${currentYear}-01-01 to ${today}`);
      const currentYearCandles = await fetchYearData(
        baseCurrency,
        quoteCurrency,
        symbol,
        `${currentYear}-01-01`,
        today,
        fastForexApiKey
      );
      dailyCandles.push(...currentYearCandles);
      
    } else if (timeframe === '4H') {
      // ⚠️ FastForex doesn't support 4H yet - fetch daily data for synthesis
      console.log('⚠️ 4H not available from FastForex - using daily data for synthesis');
      
      const currentYear = new Date().getFullYear();
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch last 6 months of daily data (will be converted to 4H)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const fromDate = sixMonthsAgo.toISOString().split('T')[0];
      
      console.log(`📆 Fetching daily data: ${fromDate} to ${today}`);
      dailyCandles = await fetchYearData(
        baseCurrency,
        quoteCurrency,
        symbol,
        fromDate,
        today,
        fastForexApiKey
      );
    }

    if (dailyCandles.length === 0) {
      throw new Error('No valid candles generated from FastForex');
    }
    
    console.log(`✅ Total daily candles fetched: ${dailyCandles.length}`);

    // Sort by timestamp
    dailyCandles.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Normalize timeframe
    const normalizedTimeframe = timeframe === '1D' ? 'D' : timeframe;
    
    let candlesToInsert: DailyCandle[] = [];
    
    // Process based on requested timeframe
    if (normalizedTimeframe === 'D') {
      candlesToInsert = dailyCandles.map(c => ({ ...c, timeframe: 'D' }));
    } else if (normalizedTimeframe === 'W') {
      candlesToInsert = aggregateDailyToWeekly(dailyCandles);
      console.log(`📊 Aggregated ${dailyCandles.length} daily -> ${candlesToInsert.length} weekly candles`);
    } else if (normalizedTimeframe === '4H') {
      dailyCandles.forEach(dailyCandle => {
        candlesToInsert.push(...generateSynthetic4HCandles(dailyCandle));
      });
      console.log(`🔧 Generated ${candlesToInsert.length} synthetic 4H candles from ${dailyCandles.length} daily`);
    }

    console.log(`💾 Upserting ${candlesToInsert.length} ${timeframe} candles for ${symbol}`);

    const inserted = await upsertCandles(supabase, candlesToInsert);

    console.log(`✅ Successfully inserted ${inserted} ${timeframe} candles for ${symbol}`);

    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        timeframe,
        inserted,
        dateRange: {
          from: candlesToInsert[0]?.timestamp,
          to: candlesToInsert[candlesToInsert.length - 1]?.timestamp
        },
        source: timeframe === '4H' ? 'synthetic_from_daily' : 'fastforex'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ fetch-historical-data error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
