import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OHLCVCandle {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  atr?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Multi-Timeframe Data Collector Started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get latest tick data from live_price_history
    const { data: tickData, error: tickError } = await supabase
      .from('live_price_history')
      .select('symbol, price, timestamp')
      .order('timestamp', { ascending: true });

    if (tickError || !tickData) {
      throw new Error('Failed to fetch tick data');
    }

    console.log(`📊 Processing ${tickData.length} tick records for multi-timeframe aggregation`);

    // Group tick data by symbol
    const symbolGroups: { [symbol: string]: Array<{ price: number; timestamp: string }> } = {};
    
    tickData.forEach(tick => {
      if (!symbolGroups[tick.symbol]) {
        symbolGroups[tick.symbol] = [];
      }
      symbolGroups[tick.symbol].push({
        price: parseFloat(tick.price),
        timestamp: tick.timestamp
      });
    });

    const timeframes = ['1M', '5M', '15M', '1H', '4H', 'D'];
    const candlesToInsert: OHLCVCandle[] = [];

    // Process each symbol and timeframe
    for (const [symbol, ticks] of Object.entries(symbolGroups)) {
      if (ticks.length < 10) continue; // Need minimum data
      
      console.log(`🔄 Processing ${symbol}: ${ticks.length} ticks`);
      
      for (const timeframe of timeframes) {
        const candles = aggregateToTimeframe(ticks, timeframe);
        
        candles.forEach(candle => {
          candlesToInsert.push({
            symbol,
            timeframe,
            timestamp: candle.timestamp,
            open_price: candle.open,
            high_price: candle.high,
            low_price: candle.low,
            close_price: candle.close,
            volume: candle.volume,
            atr: candle.atr
          });
        });
      }
    }

    console.log(`📈 Generated ${candlesToInsert.length} OHLCV candles across all timeframes`);

    // Insert candles in batches
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < candlesToInsert.length; i += batchSize) {
      const batch = candlesToInsert.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('multi_timeframe_data')
        .insert(batch)
        .onConflict('symbol,timeframe,timestamp')
        .ignoreDuplicates();
      
      if (insertError) {
        console.error(`❌ Batch insert error:`, insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    // Cleanup old data (keep last 1000 candles per symbol per timeframe)
    console.log('🧹 Cleaning old multi-timeframe data...');
    
    const { error: cleanupError } = await supabase
      .rpc('cleanup_old_timeframe_data');
    
    if (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError);
    }

    const responseData = {
      success: true,
      message: `Multi-timeframe data collection completed`,
      stats: {
        ticksProcessed: tickData.length,
        symbolsProcessed: Object.keys(symbolGroups).length,
        candlesGenerated: candlesToInsert.length,
        candlesInserted: insertedCount,
        timeframes: timeframes.length
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Multi-Timeframe Collection Complete:', responseData.stats);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Multi-Timeframe Collector Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Aggregate tick data to specific timeframes
function aggregateToTimeframe(
  ticks: Array<{ price: number; timestamp: string }>,
  timeframe: string
): Array<{
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  atr?: number;
}> {
  
  if (ticks.length === 0) return [];
  
  // Get timeframe duration in milliseconds
  const getTimeframeDuration = (tf: string): number => {
    switch (tf) {
      case '1M': return 60 * 1000;
      case '5M': return 5 * 60 * 1000;
      case '15M': return 15 * 60 * 1000;
      case '1H': return 60 * 60 * 1000;
      case '4H': return 4 * 60 * 60 * 1000;
      case 'D': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default to 1H
    }
  };
  
  const duration = getTimeframeDuration(timeframe);
  const candleGroups: { [key: string]: Array<{ price: number; timestamp: string }> } = {};
  
  // Group ticks into timeframe buckets
  ticks.forEach(tick => {
    const tickTime = new Date(tick.timestamp).getTime();
    const bucketTime = Math.floor(tickTime / duration) * duration;
    const bucketKey = new Date(bucketTime).toISOString();
    
    if (!candleGroups[bucketKey]) {
      candleGroups[bucketKey] = [];
    }
    candleGroups[bucketKey].push(tick);
  });
  
  // Create OHLCV candles from grouped ticks
  const candles = Object.entries(candleGroups)
    .filter(([_, groupTicks]) => groupTicks.length >= 2) // Need at least 2 ticks
    .map(([timestamp, groupTicks]) => {
      const prices = groupTicks.map(t => t.price);
      
      return {
        timestamp,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: prices.length,
        atr: calculateSimpleATR(prices)
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return candles.slice(-200); // Keep last 200 candles per timeframe
}

// Simple ATR calculation for individual candle groups
function calculateSimpleATR(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const ranges = [];
  for (let i = 1; i < prices.length; i++) {
    ranges.push(Math.abs(prices[i] - prices[i-1]));
  }
  
  return ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
}
