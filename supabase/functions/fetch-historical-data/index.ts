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
    const progress = (i + 0.5) / 6; // 0.083, 0.25, 0.417, 0.583, 0.75, 0.917
    const range = dailyCandle.high_price - dailyCandle.low_price;
    
    // Simulate intraday movement (slight randomization within daily range)
    const midPrice = dailyCandle.low_price + (range * progress);
    const variance = range * 0.08; // ±8% of daily range per candle
    
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
    weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay()); // Start of week (Sunday)
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

    // Parse request - expect single symbol per invocation
    const { symbol, timeframe } = await req.json();
    
    if (!symbol) {
      throw new Error('Symbol is required');
    }
    
    if (!['1D', 'W', '4H'].includes(timeframe)) {
      throw new Error('Timeframe must be 1D, W, or 4H');
    }
    
    console.log(`📊 Fetching ${symbol} ${timeframe} data`);

    // Calculate date range based on timeframe
    const now = new Date();
    const startDate = new Date(now);
    
    if (timeframe === 'W') {
      startDate.setFullYear(now.getFullYear() - 5); // 5 years for weekly
    } else if (timeframe === '1D') {
      startDate.setFullYear(now.getFullYear() - 1); // 1 year for daily
    } else if (timeframe === '4H') {
      startDate.setMonth(now.getMonth() - 6); // 6 months for 4H (we'll generate synthetic)
    }
    
    const fromDate = startDate.toISOString().split('T')[0];
    const toDate = now.toISOString().split('T')[0];
    
    console.log(`📅 Date range: ${fromDate} to ${toDate}`);

    // Extract base and quote currencies
    const baseCurrency = symbol.substring(0, 3);
    const quoteCurrency = symbol.substring(3, 6);
    
    // FastForex time-series API with correct parameters (api_key first, then start/end)
    const fastForexUrl = `https://api.fastforex.io/time-series?api_key=${fastForexApiKey}&from=${baseCurrency}&to=${quoteCurrency}&start=${fromDate}&end=${toDate}`;
    
    console.log(`🔄 Fetching ${symbol} time-series from ${fromDate} to ${toDate}`);
    
    const response = await fetch(fastForexUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`FastForex time-series failed: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || Object.keys(data.results).length === 0) {
      throw new Error('FastForex returned no results for time-series');
    }
    
    console.log(`📊 Response shape:`, Object.keys(data));
    
    // Detect if results are nested under baseCurrency (e.g., results.USD["2025-01-01"])
    let resultsByDate = data.results;
    
    if (data.results[baseCurrency] && typeof data.results[baseCurrency] === 'object') {
      // Nested structure detected
      resultsByDate = data.results[baseCurrency];
      console.log(`📦 Nested results under ${baseCurrency}: ${Object.keys(resultsByDate).length} entries`);
    } else {
      console.log(`📦 Flat results: ${Object.keys(resultsByDate).length} entries`);
    }
    
    // Only process date entries (YYYY-MM-DD format)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const validDates = Object.keys(resultsByDate).filter(key => dateRegex.test(key));
    
    console.log(`📅 Found ${validDates.length} valid dates`);
    if (validDates.length > 0) {
      const sampleDate = validDates[0];
      console.log(`📅 Sample: ${sampleDate} ->`, resultsByDate[sampleDate]);
    }

    // Convert to daily candles
    const dailyCandles: DailyCandle[] = [];
    
    for (const dateStr of validDates) {
      const rates = resultsByDate[dateStr];
      
      // Extract rate value (handle number, string, or object)
      let rateVal: number | null = null;
      
      if (typeof rates === 'number') {
        rateVal = rates;
      } else if (typeof rates === 'string') {
        rateVal = parseFloat(rates);
      } else if (typeof rates === 'object' && rates !== null) {
        // Try quoteCurrency first
        if (quoteCurrency in rates) {
          const val = rates[quoteCurrency];
          rateVal = typeof val === 'number' ? val : parseFloat(String(val));
        }
        // Try .rate property
        else if ('rate' in rates) {
          const val = rates.rate;
          rateVal = typeof val === 'number' ? val : parseFloat(String(val));
        }
        // Try to find first numeric value
        else {
          const values = Object.values(rates);
          for (const val of values) {
            if (typeof val === 'number' && val > 0) {
              rateVal = val;
              break;
            } else if (typeof val === 'string') {
              const parsed = parseFloat(val);
              if (!isNaN(parsed) && parsed > 0) {
                rateVal = parsed;
                break;
              }
            }
          }
        }
      }
      
      if (!rateVal || isNaN(rateVal) || rateVal <= 0) {
        continue;
      }
      
      const timestamp = `${dateStr}T00:00:00Z`;
      
      // Validate timestamp
      if (isNaN(Date.parse(timestamp))) {
        console.warn(`⚠️ Invalid timestamp: ${timestamp}`);
        continue;
      }
      
      // Simulate OHLC with small spread (±0.15%)
      const spread = rateVal * 0.0015;
      dailyCandles.push({
        symbol,
        timeframe: '1D',
        timestamp,
        open_price: rateVal,
        high_price: rateVal + spread,
        low_price: rateVal - spread,
        close_price: rateVal,
        volume: 0,
        source: 'fastforex'
      });
    }

    // Fallback: If still no candles, try historical endpoint for short window
    if (dailyCandles.length === 0) {
      console.warn('⚠️ Time-series returned no usable candles, trying /historical fallback...');
      
      const fallbackDays = 7;
      const fallbackCandles: DailyCandle[] = [];
      
      for (let i = 0; i < fallbackDays; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const historicalUrl = `https://api.fastforex.io/historical?api_key=${fastForexApiKey}&date=${dateStr}&from=${baseCurrency}&to=${quoteCurrency}`;
          const response = await fetch(historicalUrl, {
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const histData = await response.json();
            const rate = histData?.results?.[quoteCurrency] || histData?.rate;
            
            if (rate && !isNaN(parseFloat(rate))) {
              const rateNum = parseFloat(rate);
              const spread = rateNum * 0.0015;
              
              fallbackCandles.push({
                symbol,
                timeframe: '1D',
                timestamp: `${dateStr}T00:00:00Z`,
                open_price: rateNum,
                high_price: rateNum + spread,
                low_price: rateNum - spread,
                close_price: rateNum,
                volume: 0,
                source: 'fastforex_historical'
              });
            }
          }
        } catch (err) {
          console.warn(`⚠️ Historical fallback failed for ${dateStr}:`, err.message);
        }
        
        await new Promise(r => setTimeout(r, 100)); // Small delay between requests
      }
      
      if (fallbackCandles.length > 0) {
        console.log(`✅ Fallback succeeded: ${fallbackCandles.length} candles from /historical`);
        dailyCandles.push(...fallbackCandles);
      }
    }

    if (dailyCandles.length === 0) {
      throw new Error('No valid candles generated from FastForex (tried time-series and historical endpoints)');
    }
    
    console.log(`✅ Generated ${dailyCandles.length} daily candles`);

    // Sort by timestamp
    dailyCandles.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Normalize timeframe: '1D' -> 'D' for database consistency
    const normalizedTimeframe = timeframe === '1D' ? 'D' : timeframe;
    
    let candlesToInsert: DailyCandle[] = [];
    
    // Process based on requested timeframe
    if (normalizedTimeframe === 'D') {
      candlesToInsert = dailyCandles.map(c => ({ ...c, timeframe: 'D' }));
    } else if (normalizedTimeframe === 'W') {
      candlesToInsert = aggregateDailyToWeekly(dailyCandles);
    } else if (normalizedTimeframe === '4H') {
      // Generate synthetic 4H candles from daily data
      dailyCandles.forEach(dailyCandle => {
        candlesToInsert.push(...generateSynthetic4HCandles(dailyCandle));
      });
    }

    console.log(`💾 Upserting ${candlesToInsert.length} ${timeframe} candles for ${symbol}`);

    // Upsert to database
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
