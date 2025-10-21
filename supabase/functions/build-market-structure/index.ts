// Build Market Structure from Historical Data
// Processes candles chronologically to determine trend using body closes and structure points

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StructurePoint {
  type: 'swing_high' | 'swing_low';
  price: number;
  timestamp: string;
  index: number;
  label?: 'HH' | 'HL' | 'LL' | 'LH';
}

interface TrendState {
  trend: 'bullish' | 'bearish' | 'neutral';
  currentHH: number | null;
  currentHL: number | null;
  currentLL: number | null;
  currentLH: number | null;
  structurePoints: StructurePoint[];
}

interface Candle {
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  timestamp: string;
}

// Check if candle at index is a swing high (higher than 2 before and 2 after)
function isSwingHigh(candles: Candle[], index: number): boolean {
  if (index < 2 || index >= candles.length - 2) return false;
  
  const current = candles[index].high_price;
  
  // Check 2 candles before
  if (candles[index - 1].high_price >= current || candles[index - 2].high_price >= current) {
    return false;
  }
  
  // Check 2 candles after
  if (candles[index + 1].high_price >= current || candles[index + 2].high_price >= current) {
    return false;
  }
  
  return true;
}

// Check if candle at index is a swing low (lower than 2 before and 2 after)
function isSwingLow(candles: Candle[], index: number): boolean {
  if (index < 2 || index >= candles.length - 2) return false;
  
  const current = candles[index].low_price;
  
  // Check 2 candles before
  if (candles[index - 1].low_price <= current || candles[index - 2].low_price <= current) {
    return false;
  }
  
  // Check 2 candles after
  if (candles[index + 1].low_price <= current || candles[index + 2].low_price <= current) {
    return false;
  }
  
  return true;
}

// Find most recent structure point between two indices
function findMostRecentStructureBetween(
  structurePoints: StructurePoint[],
  startIndex: number,
  endIndex: number,
  type: 'swing_low' | 'swing_high'
): StructurePoint | null {
  // Filter points that are between the two indices and match the type
  const candidatePoints = structurePoints.filter(
    point => point.index > startIndex && point.index < endIndex && point.type === type
  );
  
  if (candidatePoints.length === 0) return null;
  
  // Return the most recent one (highest index)
  return candidatePoints.reduce((latest, current) => 
    current.index > latest.index ? current : latest
  );
}

// Update trend state based on new structure point or body close
function updateTrendState(
  state: TrendState,
  candles: Candle[],
  currentIndex: number
): TrendState {
  const newState = { ...state };
  const currentCandle = candles[currentIndex];
  const bodyClose = currentCandle.close_price;
  
  // Check if current candle forms a structure point
  const isHigh = isSwingHigh(candles, currentIndex);
  const isLow = isSwingLow(candles, currentIndex);
  
  if (isHigh) {
    const structurePoint: StructurePoint = {
      type: 'swing_high',
      price: currentCandle.high_price,
      timestamp: currentCandle.timestamp,
      index: currentIndex
    };
    newState.structurePoints.push(structurePoint);
  }
  
  if (isLow) {
    const structurePoint: StructurePoint = {
      type: 'swing_low',
      price: currentCandle.low_price,
      timestamp: currentCandle.timestamp,
      index: currentIndex
    };
    newState.structurePoints.push(structurePoint);
  }
  
  // Handle trend logic based on current trend state
  if (state.trend === 'neutral') {
    // Look for first HH+HL or LL+LH to establish trend
    const highs = newState.structurePoints.filter(p => p.type === 'swing_high');
    const lows = newState.structurePoints.filter(p => p.type === 'swing_low');
    
    if (highs.length >= 2 && lows.length >= 1) {
      // Check for bullish structure (HH + HL)
      const sortedHighs = [...highs].sort((a, b) => a.index - b.index);
      if (sortedHighs[1].price > sortedHighs[0].price) {
        // We have a HH
        const potentialHL = lows.find(l => l.index > sortedHighs[0].index && l.index < sortedHighs[1].index);
        if (potentialHL && potentialHL.price > (newState.currentLL || 0)) {
          newState.trend = 'bullish';
          newState.currentHH = sortedHighs[1].price;
          newState.currentHL = potentialHL.price;
          sortedHighs[1].label = 'HH';
          potentialHL.label = 'HL';
        }
      }
    }
    
    if (lows.length >= 2 && highs.length >= 1 && newState.trend === 'neutral') {
      // Check for bearish structure (LL + LH)
      const sortedLows = [...lows].sort((a, b) => a.index - b.index);
      if (sortedLows[1].price < sortedLows[0].price) {
        // We have a LL
        const potentialLH = highs.find(h => h.index > sortedLows[0].index && h.index < sortedLows[1].index);
        if (potentialLH && potentialLH.price < (newState.currentLH || Infinity)) {
          newState.trend = 'bearish';
          newState.currentLL = sortedLows[1].price;
          newState.currentLH = potentialLH.price;
          sortedLows[1].label = 'LL';
          potentialLH.label = 'LH';
        }
      }
    }
  } else if (state.trend === 'bullish') {
    // Check for body close below last HL (break)
    if (newState.currentHL && bodyClose < newState.currentHL) {
      console.log(`📉 Bullish break: Body closed below HL ${newState.currentHL} at ${bodyClose}`);
      newState.trend = 'bearish';
      
      // Find preceding structure point to label as new LH
      const precedingHigh = newState.structurePoints
        .filter(p => p.type === 'swing_high' && p.index < currentIndex)
        .sort((a, b) => b.index - a.index)[0];
      
      if (precedingHigh) {
        precedingHigh.label = 'LH';
        newState.currentLH = precedingHigh.price;
      }
      
      newState.currentLL = bodyClose;
      newState.currentHH = null;
      newState.currentHL = null;
    } else if (isHigh && currentCandle.high_price > (newState.currentHH || 0)) {
      // New HH formed
      console.log(`📈 New HH formed: ${currentCandle.high_price} (previous: ${newState.currentHH})`);
      
      const oldHHIndex = newState.structurePoints.findIndex(
        p => p.label === 'HH' && p.price === newState.currentHH
      );
      
      newState.currentHH = currentCandle.high_price;
      
      // Find most recent swing low between old HH and new HH
      if (oldHHIndex >= 0) {
        const newHL = findMostRecentStructureBetween(
          newState.structurePoints,
          newState.structurePoints[oldHHIndex].index,
          currentIndex,
          'swing_low'
        );
        
        if (newHL) {
          newHL.label = 'HL';
          newState.currentHL = newHL.price;
          console.log(`  └─ New HL identified: ${newHL.price}`);
        } else {
          console.log(`  └─ No new HL found, keeping old HL: ${newState.currentHL}`);
        }
      }
      
      // Label the new HH
      if (isHigh) {
        newState.structurePoints[newState.structurePoints.length - 1].label = 'HH';
      }
    }
  } else if (state.trend === 'bearish') {
    // Check for body close above last LH (break)
    if (newState.currentLH && bodyClose > newState.currentLH) {
      console.log(`📈 Bearish break: Body closed above LH ${newState.currentLH} at ${bodyClose}`);
      newState.trend = 'bullish';
      
      // Find preceding structure point to label as new HL
      const precedingLow = newState.structurePoints
        .filter(p => p.type === 'swing_low' && p.index < currentIndex)
        .sort((a, b) => b.index - a.index)[0];
      
      if (precedingLow) {
        precedingLow.label = 'HL';
        newState.currentHL = precedingLow.price;
      }
      
      newState.currentHH = bodyClose;
      newState.currentLL = null;
      newState.currentLH = null;
    } else if (isLow && currentCandle.low_price < (newState.currentLL || Infinity)) {
      // New LL formed
      console.log(`📉 New LL formed: ${currentCandle.low_price} (previous: ${newState.currentLL})`);
      
      const oldLLIndex = newState.structurePoints.findIndex(
        p => p.label === 'LL' && p.price === newState.currentLL
      );
      
      newState.currentLL = currentCandle.low_price;
      
      // Find most recent swing high between old LL and new LL
      if (oldLLIndex >= 0) {
        const newLH = findMostRecentStructureBetween(
          newState.structurePoints,
          newState.structurePoints[oldLLIndex].index,
          currentIndex,
          'swing_high'
        );
        
        if (newLH) {
          newLH.label = 'LH';
          newState.currentLH = newLH.price;
          console.log(`  └─ New LH identified: ${newLH.price}`);
        } else {
          console.log(`  └─ No new LH found, keeping old LH: ${newState.currentLH}`);
        }
      }
      
      // Label the new LL
      if (isLow) {
        newState.structurePoints[newState.structurePoints.length - 1].label = 'LL';
      }
    }
  }
  
  return newState;
}

// Main function to build trend from historical data
async function buildTrendFromHistory(
  supabase: any,
  symbol: string,
  timeframe: 'W' | 'D' | '4H'
): Promise<TrendState> {
  console.log(`🔍 Building trend for ${symbol} ${timeframe}...`);
  
  // Determine lookback period
  const lookbackMap = {
    'W': '5 years',
    'D': '1 year',
    '4H': '6 months'
  };
  
  const lookback = lookbackMap[timeframe];
  const lookbackDate = new Date();
  if (timeframe === 'W') lookbackDate.setFullYear(lookbackDate.getFullYear() - 5);
  else if (timeframe === 'D') lookbackDate.setFullYear(lookbackDate.getFullYear() - 1);
  else lookbackDate.setMonth(lookbackDate.getMonth() - 6);
  
  // Fetch historical data
  const { data: candles, error } = await supabase
    .from('multi_timeframe_data')
    .select('open_price, high_price, low_price, close_price, timestamp')
    .eq('symbol', symbol)
    .eq('timeframe', timeframe)
    .gte('timestamp', lookbackDate.toISOString())
    .order('timestamp', { ascending: true });
  
  if (error || !candles || candles.length === 0) {
    console.error(`❌ No historical data found for ${symbol} ${timeframe}:`, error);
    return {
      trend: 'neutral',
      currentHH: null,
      currentHL: null,
      currentLL: null,
      currentLH: null,
      structurePoints: []
    };
  }
  
  console.log(`📊 Processing ${candles.length} candles for ${symbol} ${timeframe}`);
  
  // Initialize state
  let state: TrendState = {
    trend: 'neutral',
    currentHH: null,
    currentHL: null,
    currentLL: null,
    currentLH: null,
    structurePoints: []
  };
  
  // Process each candle chronologically
  for (let i = 0; i < candles.length; i++) {
    state = updateTrendState(state, candles, i);
  }
  
  // FINAL VALIDATION: Check if recent price action contradicts the trend
  const recentCandles = candles.slice(-20); // Last 20 candles (~10 days for 4H, ~20 days for D, ~20 weeks for W)
  let recentBreakDetected = false;

  if (state.trend === 'bullish' && state.currentHL) {
    // Count how many recent candles closed below the HL
    const breaksCount = recentCandles.filter(c => c.close_price < state.currentHL).length;
    
    if (breaksCount >= 3) {
      console.log(`⚠️ FINAL VALIDATION: ${breaksCount}/20 recent candles closed below HL ${state.currentHL}`);
      console.log(`   Overriding bullish trend to bearish based on recent price action`);
      
      // Switch to bearish
      state.trend = 'bearish';
      recentBreakDetected = true;
      
      // Find the most recent swing high to use as LH
      const recentHighs = state.structurePoints
        .filter(p => p.type === 'swing_high')
        .sort((a, b) => b.index - a.index)
        .slice(0, 5);
      
      if (recentHighs.length > 0) {
        recentHighs[0].label = 'LH';
        state.currentLH = recentHighs[0].price;
      }
      
      // Find the lowest close in recent candles as LL
      const lowestRecentClose = Math.min(...recentCandles.map(c => c.close_price));
      state.currentLL = lowestRecentClose;
      state.currentHH = null;
      state.currentHL = null;
    }
  }

  if (state.trend === 'bearish' && state.currentLH) {
    // Count how many recent candles closed above the LH
    const breaksCount = recentCandles.filter(c => c.close_price > state.currentLH).length;
    
    if (breaksCount >= 3) {
      console.log(`⚠️ FINAL VALIDATION: ${breaksCount}/20 recent candles closed above LH ${state.currentLH}`);
      console.log(`   Overriding bearish trend to bullish based on recent price action`);
      
      // Switch to bullish
      state.trend = 'bullish';
      recentBreakDetected = true;
      
      // Find the most recent swing low to use as HL
      const recentLows = state.structurePoints
        .filter(p => p.type === 'swing_low')
        .sort((a, b) => b.index - a.index)
        .slice(0, 5);
      
      if (recentLows.length > 0) {
        recentLows[0].label = 'HL';
        state.currentHL = recentLows[0].price;
      }
      
      // Find the highest close in recent candles as HH
      const highestRecentClose = Math.max(...recentCandles.map(c => c.close_price));
      state.currentHH = highestRecentClose;
      state.currentLL = null;
      state.currentLH = null;
    }
  }

  if (recentBreakDetected) {
    console.log(`✅ FINAL VALIDATION COMPLETE: Trend adjusted to ${state.trend}`);
  }
  
  console.log(`✅ ${symbol} ${timeframe} trend: ${state.trend}${recentBreakDetected ? ' (ADJUSTED BY RECENT PRICE ACTION)' : ''}`);
  console.log(`   HH: ${state.currentHH}, HL: ${state.currentHL}, LL: ${state.currentLL}, LH: ${state.currentLH}`);
  console.log(`   Structure points identified: ${state.structurePoints.length}`);
  console.log(`   Recent candles analyzed: ${recentCandles.length}`);
  
  return state;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { symbol, timeframe } = await req.json();
    
    if (!symbol || !timeframe) {
      return new Response(
        JSON.stringify({ error: 'Missing symbol or timeframe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build trend from historical data
    const trendState = await buildTrendFromHistory(supabase, symbol, timeframe);
    
    // Upsert into market_structure_trends table
    const { error: upsertError } = await supabase
      .from('market_structure_trends')
      .upsert({
        symbol,
        timeframe,
        trend: trendState.trend,
        current_hh: trendState.currentHH,
        current_hl: trendState.currentHL,
        current_ll: trendState.currentLL,
        current_lh: trendState.currentLH,
        structure_points: trendState.structurePoints,
        last_candle_timestamp: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        confidence: trendState.structurePoints.filter(p => p.label).length / Math.max(trendState.structurePoints.length, 1)
      }, {
        onConflict: 'symbol,timeframe'
      });
    
    if (upsertError) {
      console.error('Error upserting trend state:', upsertError);
      throw upsertError;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        timeframe,
        trend: trendState.trend,
        structurePoints: trendState.structurePoints.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in build-market-structure:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
