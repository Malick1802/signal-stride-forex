// Real-time incremental ADX/DMI updates for active trading
// Triggered every 5 minutes during market hours

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAJOR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'
];

interface ADXResult {
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: 'strong' | 'moderate' | 'weak' | 'ranging';
  trendDirection: 'bullish' | 'bearish' | 'neutral';
}

// Wilder's smoothing method
function wilderSmoothing(values: number[], period: number): number[] {
  if (values.length < period) return values;
  
  const smoothed: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  smoothed.push(sum / period);
  
  for (let i = period; i < values.length; i++) {
    const prevSmoothed = smoothed[smoothed.length - 1];
    const newValue = ((prevSmoothed * (period - 1)) + values[i]) / period;
    smoothed.push(newValue);
  }
  
  return smoothed;
}

// Calculate ADX and DMI indicators
function calculateADXDMI(candles: any[], period: number = 14): ADXResult {
  if (candles.length < period + 1) {
    return {
      adx: 0,
      plusDI: 0,
      minusDI: 0,
      trendStrength: 'ranging',
      trendDirection: 'neutral'
    };
  }
  
  const trueRanges: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high_price;
    const low = candles[i].low_price;
    const prevHigh = candles[i - 1].high_price;
    const prevLow = candles[i - 1].low_price;
    const prevClose = candles[i - 1].close_price;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
    
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    
    let plusDM = 0;
    let minusDM = 0;
    
    if (upMove > downMove && upMove > 0) {
      plusDM = upMove;
    }
    if (downMove > upMove && downMove > 0) {
      minusDM = downMove;
    }
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  
  const smoothTR = wilderSmoothing(trueRanges, period);
  const smoothPlusDM = wilderSmoothing(plusDMs, period);
  const smoothMinusDM = wilderSmoothing(minusDMs, period);
  
  const plusDI = smoothTR[smoothTR.length - 1] !== 0 
    ? (smoothPlusDM[smoothPlusDM.length - 1] / smoothTR[smoothTR.length - 1]) * 100 
    : 0;
  const minusDI = smoothTR[smoothTR.length - 1] !== 0 
    ? (smoothMinusDM[smoothMinusDM.length - 1] / smoothTR[smoothTR.length - 1]) * 100 
    : 0;
  
  const dxValues: number[] = [];
  for (let i = 0; i < smoothTR.length; i++) {
    if (smoothTR[i] !== 0) {
      const pdi = (smoothPlusDM[i] / smoothTR[i]) * 100;
      const mdi = (smoothMinusDM[i] / smoothTR[i]) * 100;
      const diSum = pdi + mdi;
      const dx = diSum !== 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;
      dxValues.push(dx);
    }
  }
  
  const adxValues = wilderSmoothing(dxValues, period);
  const adx = adxValues[adxValues.length - 1] || 0;
  
  let trendStrength: 'strong' | 'moderate' | 'weak' | 'ranging';
  if (adx >= 40) trendStrength = 'strong';
  else if (adx >= 25) trendStrength = 'moderate';
  else if (adx >= 15) trendStrength = 'weak';
  else trendStrength = 'ranging';
  
  let trendDirection: 'bullish' | 'bearish' | 'neutral';
  if (plusDI > minusDI && adx >= 20) trendDirection = 'bullish';
  else if (minusDI > plusDI && adx >= 20) trendDirection = 'bearish';
  else trendDirection = 'neutral';
  
  return {
    adx: Math.round(adx * 100) / 100,
    plusDI: Math.round(plusDI * 100) / 100,
    minusDI: Math.round(minusDI * 100) / 100,
    trendStrength,
    trendDirection
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔄 Starting real-time ADX/DMI update...');
    
    const results = {
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Update 4H trends only (most relevant for real-time trading)
    for (const symbol of MAJOR_PAIRS) {
      try {
        // Fetch recent 50 candles for ADX calculation (14-period + buffer)
        const { data: candles, error: candlesError } = await supabase
          .from('multi_timeframe_data')
          .select('high_price, low_price, close_price, timestamp')
          .eq('symbol', symbol)
          .eq('timeframe', '4H')
          .order('timestamp', { ascending: true })
          .limit(50);
        
        if (candlesError) throw candlesError;
        
        if (!candles || candles.length < 15) {
          console.log(`⏭️  Insufficient data for ${symbol} (${candles?.length || 0} candles)`);
          results.skipped++;
          continue;
        }
        
        // Calculate ADX/DMI
        const adxResult = calculateADXDMI(candles);
        
        // Update only ADX fields in market_structure_trends
        const { error: updateError } = await supabase
          .from('market_structure_trends')
          .update({
            adx: adxResult.adx,
            plus_di: adxResult.plusDI,
            minus_di: adxResult.minusDI,
            trend_strength: adxResult.trendStrength,
            adx_trend_direction: adxResult.trendDirection,
            last_updated: new Date().toISOString()
          })
          .eq('symbol', symbol)
          .eq('timeframe', '4H');
        
        if (updateError) throw updateError;
        
        console.log(`✅ ${symbol}: ADX=${adxResult.adx} (${adxResult.trendStrength}), +DI=${adxResult.plusDI}, -DI=${adxResult.minusDI}`);
        results.updated++;
        
      } catch (error) {
        console.error(`❌ Failed to update ${symbol}:`, error);
        results.failed++;
        results.errors.push(`${symbol}: ${error.message}`);
      }
    }
    
    console.log(`✅ Real-time update complete`);
    console.log(`   Updated: ${results.updated}, Skipped: ${results.skipped}, Failed: ${results.failed}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        results: {
          total: MAJOR_PAIRS.length,
          updated: results.updated,
          skipped: results.skipped,
          failed: results.failed,
          errors: results.errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in update-realtime-trends:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
