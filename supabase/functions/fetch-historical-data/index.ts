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

// Helper: Chunk date range into calendar years
function chunkIntoCalendarYears(from: Date, to: Date): Array<{start: string; end: string}> {
  const chunks: Array<{start: string; end: string}> = [];
  const current = new Date(from);
  
  while (current <= to) {
    const yearStart = new Date(Math.max(current.getTime(), from.getTime()));
    const yearEnd = new Date(current.getFullYear(), 11, 31); // Dec 31 of current year
    const chunkEnd = new Date(Math.min(yearEnd.getTime(), to.getTime()));
    
    chunks.push({
      start: yearStart.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0]
    });
    
    // Move to next year
    current.setFullYear(current.getFullYear() + 1);
    current.setMonth(0, 1); // Jan 1
  }
  
  return chunks;
}

// Helper: Fetch time-series data for a single chunk
async function fetchTimeSeriesChunk(
  baseCurrency: string,
  quoteCurrency: string,
  start: string,
  end: string,
  apiKey: string
): Promise<Array<{date: string; close: number}>> {
  const url = `https://api.fastforex.io/time-series?from=${baseCurrency}&to=${quoteCurrency}&start=${start}&end=${end}&interval=day`;
  
  console.log(`🔄 Fetching chunk: ${start} to ${end}`);
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    console.warn(`⚠️ Chunk ${start}-${end} failed: HTTP ${response.status}`);
    return [];
  }
  
  const data = await response.json();
  
  if (!data.results) {
    console.warn(`⚠️ Chunk ${start}-${end} returned no results`);
    return [];
  }
  
  const dailyData: Array<{date: string; close: number}> = [];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  // Handle both flat and nested result structures
  let resultsByDate = data.results;
  
  // Check for nested structure (e.g., results.USD)
  if (resultsByDate[baseCurrency] && typeof resultsByDate[baseCurrency] === 'object') {
    resultsByDate = resultsByDate[baseCurrency];
  }
  
  // Parse results
  for (const [dateStr, value] of Object.entries(resultsByDate)) {
    if (!dateRegex.test(dateStr)) continue;
    
    let rate: number | null = null;
    
    if (typeof value === 'number') {
      rate = value;
    } else if (typeof value === 'string') {
      rate = parseFloat(value);
    } else if (typeof value === 'object' && value !== null) {
      // Try quoteCurrency key or first numeric value
      const obj = value as Record<string, any>;
      if (quoteCurrency in obj) {
        const val = obj[quoteCurrency];
        rate = typeof val === 'number' ? val : parseFloat(String(val));
      } else {
        const firstNum = Object.values(obj).find(v => typeof v === 'number' && v > 0);
        if (firstNum) rate = firstNum as number;
      }
    }
    
    if (rate && !isNaN(rate) && rate > 0) {
      dailyData.push({ date: dateStr, close: rate });
    }
  }
  
  console.log(`✅ Chunk ${start}-${end}: ${dailyData.length} days`);
  return dailyData;
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

    // Parse request with optional year overrides
    const { symbol, timeframe, yearsD = 1, yearsW = 6, years4H = 1 } = await req.json();
    
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
      startDate.setFullYear(now.getFullYear() - yearsW);
    } else if (timeframe === '1D') {
      startDate.setFullYear(now.getFullYear() - yearsD);
    } else if (timeframe === '4H') {
      startDate.setFullYear(now.getFullYear() - years4H);
    }
    
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);

    // Extract base and quote currencies
    const baseCurrency = symbol.substring(0, 3);
    const quoteCurrency = symbol.substring(3, 6);
    
    // Chunk the date range into calendar years
    const chunks = chunkIntoCalendarYears(startDate, now);
    console.log(`📦 Split into ${chunks.length} calendar-year chunks`);
    
    // Fetch all chunks
    const allDailyData: Array<{date: string; close: number}> = [];
    
    for (const chunk of chunks) {
      const chunkData = await fetchTimeSeriesChunk(
        baseCurrency,
        quoteCurrency,
        chunk.start,
        chunk.end,
        fastForexApiKey
      );
      
      allDailyData.push(...chunkData);
      
      // Small delay between chunks to respect rate limits
      await new Promise(r => setTimeout(r, 200));
    }
    
    console.log(`✅ Total daily data points collected: ${allDailyData.length}`);
    
    // Fallback to /historical for last 7 days if we got NO data at all
    if (allDailyData.length === 0) {
      console.warn('⚠️ No data from time-series chunks, trying /historical fallback...');
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const historicalUrl = `https://api.fastforex.io/historical?from=${baseCurrency}&to=${quoteCurrency}&date=${dateStr}`;
          const response = await fetch(historicalUrl, {
            headers: {
              'X-API-Key': fastForexApiKey,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const histData = await response.json();
            const rate = histData?.results?.[quoteCurrency];
            
            if (rate && !isNaN(parseFloat(rate))) {
              allDailyData.push({ date: dateStr, close: parseFloat(rate) });
            }
          }
        } catch (err) {
          console.warn(`⚠️ Historical fallback failed for ${dateStr}:`, err.message);
        }
        
        await new Promise(r => setTimeout(r, 100));
      }
      
      console.log(`✅ Fallback collected: ${allDailyData.length} days`);
    }
    
    if (allDailyData.length === 0) {
      throw new Error('No data retrieved from FastForex (tried time-series and historical)');
    }
    
    // Convert to DailyCandle format with OHLC simulation
    const dailyCandles: DailyCandle[] = allDailyData.map(({ date, close }) => {
      const spread = close * 0.0015; // ±0.15%
      return {
        symbol,
        timeframe: '1D',
        timestamp: `${date}T00:00:00Z`,
        open_price: close,
        high_price: close + spread,
        low_price: close - spread,
        close_price: close,
        volume: 0,
        source: 'fastforex'
      };
    });
    
    // Sort by timestamp
    dailyCandles.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    console.log(`✅ Generated ${dailyCandles.length} daily candles`);

    // Normalize timeframe: '1D' -> 'D' for database consistency
    const normalizedTimeframe = timeframe === '1D' ? 'D' : timeframe;
    
    let candlesToInsert: DailyCandle[] = [];
    
    // Process based on requested timeframe
    if (normalizedTimeframe === 'D') {
      candlesToInsert = dailyCandles.map(c => ({ ...c, timeframe: 'D' }));
    } else if (normalizedTimeframe === 'W') {
      candlesToInsert = aggregateDailyToWeekly(dailyCandles);
      console.log(`✅ Aggregated to ${candlesToInsert.length} weekly candles`);
    } else if (normalizedTimeframe === '4H') {
      console.log(`ℹ️ Generating synthetic 4H candles from daily data (FastForex doesn't provide 4H yet)`);
      dailyCandles.forEach(dailyCandle => {
        candlesToInsert.push(...generateSynthetic4HCandles(dailyCandle));
      });
      console.log(`✅ Generated ${candlesToInsert.length} synthetic 4H candles`);
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
        dailyDataPoints: allDailyData.length,
        chunks: chunks.length,
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
