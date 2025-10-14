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
    
    // Try multiple parameter variants for FastForex API
    // CRITICAL: 'to' parameter is for target currency, NOT date range!
    const variants = [
      { name: 'A', params: `date_from=${encodeURIComponent(fromDate)}&date_to=${encodeURIComponent(toDate)}&from=${encodeURIComponent(baseCurrency)}&to=${encodeURIComponent(quoteCurrency)}` },
      { name: 'B', params: `start=${encodeURIComponent(fromDate)}&end=${encodeURIComponent(toDate)}&from=${encodeURIComponent(baseCurrency)}&to=${encodeURIComponent(quoteCurrency)}` },
    ];
    
    let data: any = null;
    let lastError: string = '';
    
    for (const variant of variants) {
      const fastForexUrl = `https://api.fastforex.io/time-series?${variant.params}&api_key=${fastForexApiKey}`;
      
      console.log(`🔄 Fetching ${symbol} (variant ${variant.name}): ${fromDate} to ${toDate}`);
      
      try {
        const response = await fetch(fastForexUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
          lastError = `Variant ${variant.name} failed (${response.status}): ${responseText}`;
          console.warn(`⚠️ ${lastError}`);
          
          // If error suggests wrong parameter, try next variant
          if (responseText.includes('Invalid/unsupported currency') || 
              responseText.includes('required parameter') ||
              responseText.includes('Please supply')) {
            continue;
          }
          
          throw new Error(lastError);
        }
        
        const jsonData = JSON.parse(responseText);
        
        if (!jsonData.results || Object.keys(jsonData.results).length === 0) {
          lastError = `Variant ${variant.name} returned no results`;
          console.warn(`⚠️ ${lastError}`);
          continue;
        }
        
        // Success!
        data = jsonData;
        console.log(`✅ Variant ${variant.name} succeeded: ${Object.keys(data.results).length} data points`);
        break;
        
      } catch (err) {
        lastError = `Variant ${variant.name} error: ${err.message}`;
        console.warn(`⚠️ ${lastError}`);
        continue;
      }
    }
    
    if (!data || !data.results) {
      throw new Error(`All FastForex parameter variants failed. Last error: ${lastError}`);
    }

    // Convert to daily candles with tolerant parser
    const dailyCandles: DailyCandle[] = [];
    let firstEntrySampled = false;
    
    Object.entries(data.results).forEach(([date, rates]: [string, any]) => {
      // Debug log for first entry to understand response shape
      if (!firstEntrySampled) {
        console.log(`📊 Sample result entry for ${date}:`, typeof rates, Object.keys(rates || {}).slice(0, 5));
        firstEntrySampled = true;
      }
      
      // Extract rate value tolerantly from various response shapes
      let rateVal: number | null = null;
      
      if (typeof rates === 'number') {
        rateVal = rates;
      } else if (typeof rates === 'string') {
        rateVal = parseFloat(rates);
      } else if (typeof rates === 'object' && rates !== null) {
        // Try quoteCurrency key first
        if (rates[quoteCurrency] !== undefined) {
          rateVal = typeof rates[quoteCurrency] === 'number' 
            ? rates[quoteCurrency] 
            : parseFloat(rates[quoteCurrency]);
        } 
        // Try 'rate' key
        else if (rates.rate !== undefined) {
          rateVal = typeof rates.rate === 'number' 
            ? rates.rate 
            : parseFloat(rates.rate);
        }
        // Find first numeric value in object
        else {
          const firstNumeric = Object.values(rates).find(v => 
            typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)))
          );
          if (firstNumeric !== undefined) {
            rateVal = typeof firstNumeric === 'number' 
              ? firstNumeric 
              : parseFloat(firstNumeric as string);
          }
        }
      }
      
      // Only create candle if we got a valid number
      if (rateVal && !isNaN(rateVal) && rateVal > 0) {
        // Simulate OHLC from single rate (±0.15% spread)
        const spread = rateVal * 0.0015;
        dailyCandles.push({
          symbol,
          timeframe: '1D',
          timestamp: `${date}T00:00:00Z`,
          open_price: rateVal,
          high_price: rateVal + spread,
          low_price: rateVal - spread,
          close_price: rateVal,
          volume: 0,
          source: 'fastforex'
        });
      }
    });

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
          const historicalUrl = `https://api.fastforex.io/historical?date=${dateStr}&from=${baseCurrency}&to=${quoteCurrency}&api_key=${fastForexApiKey}`;
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

    let candlesToInsert: DailyCandle[] = [];
    
    // Process based on requested timeframe
    if (timeframe === '1D') {
      candlesToInsert = dailyCandles;
    } else if (timeframe === 'W') {
      candlesToInsert = aggregateDailyToWeekly(dailyCandles);
    } else if (timeframe === '4H') {
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
