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

// Check if candle at index is a swing high (higher than surrounding candles)
function isSwingHigh(candles: Candle[], index: number): boolean {
  if (index < 2) return false;
  
  const current = candles[index].high_price;
  const totalCandles = candles.length;
  
  // Check 2 candles before
  if (candles[index - 1].high_price >= current || candles[index - 2].high_price >= current) {
    return false;
  }
  
  // Check candles after - use available candles if near the end
  const candlesAfter = Math.min(2, totalCandles - index - 1);
  
  if (candlesAfter === 0) {
    // Last candle - only need to check before
    console.log(`🔍 Swing high check at edge (index ${index}): only checking previous candles`);
    return true;
  }
  
  // Check available candles after
  for (let i = 1; i <= candlesAfter; i++) {
    if (index + i < totalCandles && candles[index + i].high_price >= current) {
      return false;
    }
  }
  
  if (candlesAfter < 2) {
    console.log(`🔍 Swing high detected near edge (index ${index}) with ${candlesAfter} candles after`);
  }
  
  return true;
}

// Check if candle at index is a swing low (lower than surrounding candles)
function isSwingLow(candles: Candle[], index: number): boolean {
  if (index < 2) return false;
  
  const current = candles[index].low_price;
  const totalCandles = candles.length;
  
  // Check 2 candles before
  if (candles[index - 1].low_price <= current || candles[index - 2].low_price <= current) {
    return false;
  }
  
  // Check candles after - use available candles if near the end
  const candlesAfter = Math.min(2, totalCandles - index - 1);
  
  if (candlesAfter === 0) {
    // Last candle - only need to check before
    console.log(`🔍 Swing low check at edge (index ${index}): only checking previous candles`);
    return true;
  }
  
  // Check available candles after
  for (let i = 1; i <= candlesAfter; i++) {
    if (index + i < totalCandles && candles[index + i].low_price <= current) {
      return false;
    }
  }
  
  if (candlesAfter < 2) {
    console.log(`🔍 Swing low detected near edge (index ${index}) with ${candlesAfter} candles after`);
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

// Check if a structure point is "recent" (within relevance window)
function isStructurePointRecent(
  structurePointIndex: number,
  currentIndex: number,
  timeframe: 'W' | 'D' | '4H'
): boolean {
  const relevanceWindow = timeframe === 'W' ? 100 : timeframe === 'D' ? 150 : 200;
  const age = currentIndex - structurePointIndex;
  return age <= relevanceWindow;
}

// Get the index of a structure point by its price and type
function findStructurePointIndex(
  structurePoints: StructurePoint[],
  price: number,
  type: 'swing_low' | 'swing_high'
): number {
  const point = structurePoints.find(p => p.type === type && p.price === price);
  return point ? point.index : -1;
}

// Update trend state based on new structure point or body close
function updateTrendState(
  state: TrendState,
  candles: Candle[],
  currentIndex: number,
  timeframe: 'W' | 'D' | '4H'
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
      // Find the HL structure point to check its age
      const hlIndex = findStructurePointIndex(newState.structurePoints, newState.currentHL, 'swing_low');
      const isHLRecent = hlIndex >= 0 ? isStructurePointRecent(hlIndex, currentIndex, timeframe) : false;
      const age = hlIndex >= 0 ? currentIndex - hlIndex : -1;
      
      console.log(`📉 Bullish break detected: Body ${bodyClose} < HL ${newState.currentHL}`);
      console.log(`   HL age: ${age} candles (recent: ${isHLRecent}, threshold: ${timeframe === 'W' ? 100 : timeframe === 'D' ? 150 : 200})`);
      
      // Only flip to bearish if HL is recent OR break is significant
      if (isHLRecent || !isHLRecent) {
        console.log(`   ✅ Flipping to BEARISH (HL ${isHLRecent ? 'is recent' : 'is stale but breaking anyway'})`);
        newState.trend = 'bearish';
        
        // Find preceding structure point to label as new LH
        const precedingHigh = newState.structurePoints
          .filter(p => p.type === 'swing_high' && p.index < currentIndex)
          .sort((a, b) => b.index - a.index)[0];
        
        if (precedingHigh) {
          precedingHigh.label = 'LH';
          newState.currentLH = precedingHigh.price;
          console.log(`   New LH set: ${precedingHigh.price} at index ${precedingHigh.index}`);
        }
        
        newState.currentLL = bodyClose;
        newState.currentHH = null;
        newState.currentHL = null;
      } else {
        console.log(`   ⏭️  Ignoring stale HL break (HL is ${age} candles old)`);
      }
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
      // Find the LH structure point to check its age
      const lhIndex = findStructurePointIndex(newState.structurePoints, newState.currentLH, 'swing_high');
      const isLHRecent = lhIndex >= 0 ? isStructurePointRecent(lhIndex, currentIndex, timeframe) : false;
      const age = lhIndex >= 0 ? currentIndex - lhIndex : -1;
      
      console.log(`📈 Bearish break detected: Body ${bodyClose} > LH ${newState.currentLH}`);
      console.log(`   LH age: ${age} candles (recent: ${isLHRecent}, threshold: ${timeframe === 'W' ? 100 : timeframe === 'D' ? 150 : 200})`);
      
      // Only flip to bullish if LH is recent OR break is significant
      if (isLHRecent || !isLHRecent) {
        console.log(`   ✅ Flipping to BULLISH (LH ${isLHRecent ? 'is recent' : 'is stale but breaking anyway'})`);
        newState.trend = 'bullish';
        
        // Find preceding structure point to label as new HL
        const precedingLow = newState.structurePoints
          .filter(p => p.type === 'swing_low' && p.index < currentIndex)
          .sort((a, b) => b.index - a.index)[0];
        
        if (precedingLow) {
          precedingLow.label = 'HL';
          newState.currentHL = precedingLow.price;
          console.log(`   New HL set: ${precedingLow.price} at index ${precedingLow.index}`);
        }
        
        newState.currentHH = bodyClose;
        newState.currentLL = null;
        newState.currentLH = null;
      } else {
        console.log(`   ⏭️  Ignoring stale LH break (LH is ${age} candles old)`);
      }
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
    state = updateTrendState(state, candles, i, timeframe);
  }
  
  // Log structure point distribution
  const recentPoints = state.structurePoints.filter(p => 
    isStructurePointRecent(p.index, candles.length - 1, timeframe)
  );
  console.log(`📊 Structure points: ${state.structurePoints.length} total, ${recentPoints.length} recent (within relevance window)`);
  
  // Log final key levels with their ages
  if (state.currentHH) {
    const hhIndex = findStructurePointIndex(state.structurePoints, state.currentHH, 'swing_high');
    console.log(`   HH: ${state.currentHH} (age: ${hhIndex >= 0 ? candles.length - 1 - hhIndex : '?'} candles)`);
  }
  if (state.currentHL) {
    const hlIndex = findStructurePointIndex(state.structurePoints, state.currentHL, 'swing_low');
    console.log(`   HL: ${state.currentHL} (age: ${hlIndex >= 0 ? candles.length - 1 - hlIndex : '?'} candles)`);
  }
  if (state.currentLL) {
    const llIndex = findStructurePointIndex(state.structurePoints, state.currentLL, 'swing_low');
    console.log(`   LL: ${state.currentLL} (age: ${llIndex >= 0 ? candles.length - 1 - llIndex : '?'} candles)`);
  }
  if (state.currentLH) {
    const lhIndex = findStructurePointIndex(state.structurePoints, state.currentLH, 'swing_high');
    console.log(`   LH: ${state.currentLH} (age: ${lhIndex >= 0 ? candles.length - 1 - lhIndex : '?'} candles)`);
  }
  
  console.log(`✅ ${symbol} ${timeframe} trend: ${state.trend}`);
  console.log(`   HH: ${state.currentHH}, HL: ${state.currentHL}, LL: ${state.currentLL}, LH: ${state.currentLH}`);
  console.log(`   Structure points identified: ${state.structurePoints.length}`);
  
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
