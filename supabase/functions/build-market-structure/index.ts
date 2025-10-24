// Build Market Structure from Historical Data (BODY CLOSES ONLY)
// Uses only body closes for all structure identification: swing points, HH/HL/LL/LH, and trend breaks
// Includes pip buffers (W: 40, D: 25, 4H: 15 pips) to prevent false breaks from noise

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

// Get pip size for symbol
function getPipSize(symbol: string): number {
  return symbol.includes('JPY') ? 0.01 : 0.0001;
}

// Get minimum buffer in pips based on timeframe
function getMinBufferPips(timeframe: 'W' | 'D' | '4H'): number {
  const buffers = { 'W': 40, 'D': 25, '4H': 15 };
  return buffers[timeframe];
}

// Check if candle at index is a swing high (body close higher than surrounding body closes)
function isSwingHigh(candles: Candle[], index: number): boolean {
  if (index < 2) return false;
  
  const current = candles[index].close_price;
  const totalCandles = candles.length;
  
  // Check 2 candles before
  if (candles[index - 1].close_price >= current || candles[index - 2].close_price >= current) {
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
    if (index + i < totalCandles && candles[index + i].close_price >= current) {
      return false;
    }
  }
  
  if (candlesAfter < 2) {
    console.log(`🔍 Swing high detected near edge (index ${index}) with ${candlesAfter} candles after`);
  }
  
  return true;
}

// Check if candle at index is a swing low (body close lower than surrounding body closes)
function isSwingLow(candles: Candle[], index: number): boolean {
  if (index < 2) return false;
  
  const current = candles[index].close_price;
  const totalCandles = candles.length;
  
  // Check 2 candles before
  if (candles[index - 1].close_price <= current || candles[index - 2].close_price <= current) {
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
    if (index + i < totalCandles && candles[index + i].close_price <= current) {
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
  const relevanceWindow = timeframe === 'W' ? 100 : timeframe === 'D' ? 150 : 100;
  const age = currentIndex - structurePointIndex;
  return age <= relevanceWindow;
}

// Get the index of a structure point by its price and type (with tolerance for floating point errors)
function findStructurePointIndex(
  structurePoints: StructurePoint[],
  price: number,
  type: 'swing_low' | 'swing_high'
): number {
  const tolerance = 0.000001; // 1 micro-pip tolerance for floating point comparison
  const point = structurePoints.find(p => 
    p.type === type && Math.abs(p.price - price) < tolerance
  );
  return point ? point.index : -1;
}

// Detect recent bearish flip pattern (LL + LH) within relevance window
function detectRecentBearishFlip(
  state: TrendState,
  candles: Candle[],
  currentIndex: number,
  timeframe: 'W' | 'D' | '4H',
  symbol: string
): { shouldFlip: boolean; recentLL: StructurePoint | null; recentLH: StructurePoint | null } {
  // Filter to recent points only
  const recentPoints = state.structurePoints.filter(p => 
    isStructurePointRecent(p.index, currentIndex, timeframe)
  );
  
  // Find two most recent lows
  const recentLows = recentPoints.filter(p => p.type === 'swing_low')
    .sort((a, b) => b.index - a.index); // newest first
  
  if (recentLows.length < 2) return { shouldFlip: false, recentLL: null, recentLH: null };
  
  const L2 = recentLows[0]; // newest low
  const L1 = recentLows[1]; // previous low
  
  // Check for LL (L2 < L1)
  if (L2.price >= L1.price) return { shouldFlip: false, recentLL: null, recentLH: null };
  
  // Find recent highs
  const recentHighs = recentPoints.filter(p => p.type === 'swing_high');
  
  // Find most recent high between L1 and L2
  const H2 = recentHighs.filter(h => h.index > L1.index && h.index < L2.index)
    .sort((a, b) => b.index - a.index)[0];
  
  // Find most recent high before L1
  const H1 = recentHighs.filter(h => h.index < L1.index)
    .sort((a, b) => b.index - a.index)[0];
  
  if (!H1 || !H2) return { shouldFlip: false, recentLL: null, recentLH: null };
  
  // Check for LH (H2 < H1)
  if (H2.price >= H1.price) return { shouldFlip: false, recentLL: null, recentLH: null };
  
  // ✅ NEW: Validate that body closes actually broke below the LH with buffer
  const pipSize = getPipSize(symbol);
  const minBuffer = getMinBufferPips(timeframe) * pipSize;
  
  // Get all candles after LH formation
  const candlesAfterLH = candles.slice(H2.index + 1, currentIndex + 1);
  
  // Check if any body close broke below LH with buffer
  const hasBreakBelow = candlesAfterLH.some(candle => 
    candle.close_price < H2.price - minBuffer
  );
  
  if (!hasBreakBelow) {
    const closestApproach = candlesAfterLH.length > 0 
      ? Math.min(...candlesAfterLH.map(c => c.close_price))
      : null;
    const distancePips = closestApproach 
      ? Math.round((closestApproach - H2.price) / pipSize)
      : null;
    
    console.log(`🧭 [${symbol} ${timeframe}] LL+LH pattern exists but NO body close broke below LH:`);
    console.log(`   LH: ${H2.price.toFixed(5)} at index ${H2.index}`);
    console.log(`   Required break: ${(H2.price - minBuffer).toFixed(5)} (LH - ${getMinBufferPips(timeframe)} pips)`);
    console.log(`   Closest body close: ${closestApproach?.toFixed(5) || 'N/A'} (${distancePips !== null ? distancePips + ' pips' : 'N/A'} from LH)`);
    console.log(`   ⏭️  Pattern rejected - no confirmed break`);
    return { shouldFlip: false, recentLL: null, recentLH: null };
  }
  
  console.log(`🧭 [${symbol} ${timeframe}] Recent bearish pattern detected WITH body-close break:`);
  console.log(`   LL: L1=${L1.price.toFixed(5)} (idx ${L1.index}) -> L2=${L2.price.toFixed(5)} (idx ${L2.index})`);
  console.log(`   LH: H1=${H1.price.toFixed(5)} (idx ${H1.index}) -> H2=${H2.price.toFixed(5)} (idx ${H2.index})`);
  console.log(`   ✅ Confirmed: Body close(s) broke below LH ${H2.price.toFixed(5)} - ${getMinBufferPips(timeframe)} pips`);
  
  return { shouldFlip: true, recentLL: L2, recentLH: H2 };
}

// Detect recent bullish flip pattern (HH + HL) within relevance window
function detectRecentBullishFlip(
  state: TrendState,
  candles: Candle[],
  currentIndex: number,
  timeframe: 'W' | 'D' | '4H',
  symbol: string
): { shouldFlip: boolean; recentHH: StructurePoint | null; recentHL: StructurePoint | null } {
  // Filter to recent points only
  const recentPoints = state.structurePoints.filter(p => 
    isStructurePointRecent(p.index, currentIndex, timeframe)
  );
  
  // Find two most recent highs
  const recentHighs = recentPoints.filter(p => p.type === 'swing_high')
    .sort((a, b) => b.index - a.index); // newest first
  
  if (recentHighs.length < 2) return { shouldFlip: false, recentHH: null, recentHL: null };
  
  const H2 = recentHighs[0]; // newest high
  const H1 = recentHighs[1]; // previous high
  
  // Check for HH (H2 > H1)
  if (H2.price <= H1.price) return { shouldFlip: false, recentHH: null, recentHL: null };
  
  // Find recent lows
  const recentLows = recentPoints.filter(p => p.type === 'swing_low');
  
  // Find most recent low between H1 and H2
  const L2 = recentLows.filter(l => l.index > H1.index && l.index < H2.index)
    .sort((a, b) => b.index - a.index)[0];
  
  // Find most recent low before H1
  const L1 = recentLows.filter(l => l.index < H1.index)
    .sort((a, b) => b.index - a.index)[0];
  
  if (!L1 || !L2) return { shouldFlip: false, recentHH: null, recentHL: null };
  
  // Check for HL (L2 > L1)
  if (L2.price <= L1.price) return { shouldFlip: false, recentHH: null, recentHL: null };
  
  // ✅ NEW: Validate that body closes actually broke above the HL with buffer
  const pipSize = getPipSize(symbol);
  const minBuffer = getMinBufferPips(timeframe) * pipSize;
  
  // Get all candles after HL formation
  const candlesAfterHL = candles.slice(L2.index + 1, currentIndex + 1);
  
  // Check if any body close broke above HL with buffer
  const hasBreakAbove = candlesAfterHL.some(candle => 
    candle.close_price > L2.price + minBuffer
  );
  
  if (!hasBreakAbove) {
    const closestApproach = candlesAfterHL.length > 0 
      ? Math.max(...candlesAfterHL.map(c => c.close_price))
      : null;
    const distancePips = closestApproach 
      ? Math.round((closestApproach - L2.price) / pipSize)
      : null;
    
    console.log(`🧭 [${symbol} ${timeframe}] HH+HL pattern exists but NO body close broke above HL:`);
    console.log(`   HL: ${L2.price.toFixed(5)} at index ${L2.index}`);
    console.log(`   Required break: ${(L2.price + minBuffer).toFixed(5)} (HL + ${getMinBufferPips(timeframe)} pips)`);
    console.log(`   Closest body close: ${closestApproach?.toFixed(5) || 'N/A'} (${distancePips !== null ? distancePips + ' pips' : 'N/A'} from HL)`);
    console.log(`   ⏭️  Pattern rejected - no confirmed break`);
    return { shouldFlip: false, recentHH: null, recentHL: null };
  }
  
  console.log(`🧭 [${symbol} ${timeframe}] Recent bullish pattern detected WITH body-close break:`);
  console.log(`   HH: H1=${H1.price.toFixed(5)} (idx ${H1.index}) -> H2=${H2.price.toFixed(5)} (idx ${H2.index})`);
  console.log(`   HL: L1=${L1.price.toFixed(5)} (idx ${L1.index}) -> L2=${L2.price.toFixed(5)} (idx ${L2.index})`);
  console.log(`   ✅ Confirmed: Body close(s) broke above HL ${L2.price.toFixed(5)} + ${getMinBufferPips(timeframe)} pips`);
  
  return { shouldFlip: true, recentHH: H2, recentHL: L2 };
}

// Update trend state based on new structure point or body close
function updateTrendState(
  state: TrendState,
  candles: Candle[],
  currentIndex: number,
  timeframe: 'W' | 'D' | '4H',
  symbol: string
): TrendState {
  const newState = { ...state };
  const currentCandle = candles[currentIndex];
  const bodyClose = currentCandle.close_price;
  
  // Calculate pip buffer for break detection
  const pipSize = getPipSize(symbol);
  const bufferPips = getMinBufferPips(timeframe);
  const minBuffer = bufferPips * pipSize;
  
  // Debug logging for GBPUSD 4H
  const isDebugPair = symbol === 'GBPUSD' && timeframe === '4H';
  if (isDebugPair && currentIndex > 990) {
    console.log(`🔍 [${symbol} ${timeframe}] Index ${currentIndex}: trend=${state.trend}, bodyClose=${bodyClose}, HL=${state.currentHL}, HH=${state.currentHH}`);
  }
  
  // Check if current candle forms a structure point
  const isHigh = isSwingHigh(candles, currentIndex);
  const isLow = isSwingLow(candles, currentIndex);
  
  if (isHigh) {
    const structurePoint: StructurePoint = {
      type: 'swing_high',
      price: currentCandle.close_price,
      timestamp: currentCandle.timestamp,
      index: currentIndex
    };
    newState.structurePoints.push(structurePoint);
  }
  
  if (isLow) {
    const structurePoint: StructurePoint = {
      type: 'swing_low',
      price: currentCandle.close_price,
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
    // Debug: Log entry to bullish trend processing
    if (isDebugPair && currentIndex > 990) {
      console.log(`🔵 [${symbol} ${timeframe}] Bullish trend processing at index ${currentIndex}`);
      console.log(`   Checking break: bodyClose=${bodyClose}, HL=${newState.currentHL}, minBuffer=${minBuffer}`);
      console.log(`   Break condition: ${bodyClose} < ${newState.currentHL ? newState.currentHL - minBuffer : 'N/A'} = ${newState.currentHL ? bodyClose < newState.currentHL - minBuffer : false}`);
    }
    
    // Check for body close below last HL with buffer (break)
    if (newState.currentHL && bodyClose < newState.currentHL - minBuffer) {
      // Find the HL structure point to check its age
      const hlIndex = findStructurePointIndex(newState.structurePoints, newState.currentHL, 'swing_low');
      const isHLRecent = hlIndex >= 0 ? isStructurePointRecent(hlIndex, currentIndex, timeframe) : false;
      const age = hlIndex >= 0 ? currentIndex - hlIndex : -1;
      const breakDistancePips = Math.abs(bodyClose - newState.currentHL) / pipSize;
      
      // Enhanced debug logging for GBPUSD 4H
      if (isDebugPair) {
        console.log(`🚨 [${symbol} ${timeframe}] BULLISH BREAK DETECTED at index ${currentIndex}:`);
        console.log(`   Body: ${bodyClose}, HL: ${newState.currentHL}, Buffer: ${minBuffer} (${bufferPips} pips)`);
        console.log(`   hlIndex from findStructurePointIndex: ${hlIndex}`);
        console.log(`   Age: ${age} candles, isHLRecent: ${isHLRecent}`);
        console.log(`   Relevance window: ${Math.floor(candles.length * 0.1)} candles (10% of ${candles.length})`);
      }
      
      console.log(`📉 Bullish break detected: Body ${bodyClose} < HL ${newState.currentHL} - ${bufferPips} pips`);
      console.log(`   Break distance: ${breakDistancePips.toFixed(1)} pips (buffer: ${bufferPips} pips)`);
      console.log(`   HL age: ${age} candles (recent: ${isHLRecent}, threshold: ${timeframe === 'W' ? 100 : timeframe === 'D' ? 150 : 200})`);
      
      // Only flip to bearish if HL is recent
      if (isHLRecent) {
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
        
        // Check for recent-only bearish flip when HL is stale
        const bearishFlip = detectRecentBearishFlip(newState, candles, currentIndex, timeframe, symbol);
        if (bearishFlip.shouldFlip && bearishFlip.recentLL && bearishFlip.recentLH) {
          console.log(`🧭 Recent-only bearish flip: LL + LH found within relevance window (stale HL bypass)`);
          newState.trend = 'bearish';
          newState.currentLL = bearishFlip.recentLL.price;
          newState.currentLH = bearishFlip.recentLH.price;
          newState.currentHH = null;
          newState.currentHL = null;
          
          // Label the structure points
          bearishFlip.recentLL.label = 'LL';
          bearishFlip.recentLH.label = 'LH';
          
          console.log(`✅ Flipped to BEARISH via recent-only pattern (LL=${newState.currentLL?.toFixed(5)}, LH=${newState.currentLH?.toFixed(5)})`);
        }
      }
    } else if (isHigh && currentCandle.close_price > (newState.currentHH || 0)) {
      // New HH formed (body close)
      console.log(`📈 New HH formed: ${currentCandle.close_price} (previous: ${newState.currentHH})`);
      
      const oldHHIndex = newState.structurePoints.findIndex(
        p => p.label === 'HH' && p.price === newState.currentHH
      );
      
      newState.currentHH = currentCandle.close_price;
      
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
    
    // After processing structure, check for recent-only bearish flip if HL is stale/missing
    if (!newState.currentHL || !isStructurePointRecent(
      findStructurePointIndex(newState.structurePoints, newState.currentHL, 'swing_low'),
      currentIndex,
      timeframe
    )) {
      const bearishFlip = detectRecentBearishFlip(newState, candles, currentIndex, timeframe, symbol);
      if (bearishFlip.shouldFlip && bearishFlip.recentLL && bearishFlip.recentLH) {
        console.log(`🧭 Recent-only bearish flip detected (HL stale/missing, checking recent structure)`);
        newState.trend = 'bearish';
        newState.currentLL = bearishFlip.recentLL.price;
        newState.currentLH = bearishFlip.recentLH.price;
        newState.currentHH = null;
        newState.currentHL = null;
        
        // Label the structure points
        bearishFlip.recentLL.label = 'LL';
        bearishFlip.recentLH.label = 'LH';
        
        console.log(`✅ Flipped to BEARISH via recent-only pattern (LL=${newState.currentLL?.toFixed(5)}, LH=${newState.currentLH?.toFixed(5)})`);
      }
    }
  } else if (state.trend === 'bearish') {
    // Check for body close above last LH with buffer (break)
    if (newState.currentLH && bodyClose > newState.currentLH + minBuffer) {
      // Find the LH structure point to check its age
      const lhIndex = findStructurePointIndex(newState.structurePoints, newState.currentLH, 'swing_high');
      const isLHRecent = lhIndex >= 0 ? isStructurePointRecent(lhIndex, currentIndex, timeframe) : false;
      const age = lhIndex >= 0 ? currentIndex - lhIndex : -1;
      const breakDistancePips = Math.abs(bodyClose - newState.currentLH) / pipSize;
      
      console.log(`📈 Bearish break detected: Body ${bodyClose} > LH ${newState.currentLH} + ${bufferPips} pips`);
      console.log(`   Break distance: ${breakDistancePips.toFixed(1)} pips (buffer: ${bufferPips} pips)`);
      console.log(`   LH age: ${age} candles (recent: ${isLHRecent}, threshold: ${timeframe === 'W' ? 100 : timeframe === 'D' ? 150 : 200})`);
      
      // Only flip to bullish if LH is recent
      if (isLHRecent) {
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
        
        // Check for recent-only bullish flip when LH is stale
        const bullishFlip = detectRecentBullishFlip(newState, candles, currentIndex, timeframe, symbol);
        if (bullishFlip.shouldFlip && bullishFlip.recentHH && bullishFlip.recentHL) {
          console.log(`🧭 Recent-only bullish flip: HH + HL found within relevance window (stale LH bypass)`);
          newState.trend = 'bullish';
          newState.currentHH = bullishFlip.recentHH.price;
          newState.currentHL = bullishFlip.recentHL.price;
          newState.currentLL = null;
          newState.currentLH = null;
          
          // Label the structure points
          bullishFlip.recentHH.label = 'HH';
          bullishFlip.recentHL.label = 'HL';
          
          console.log(`✅ Flipped to BULLISH via recent-only pattern (HH=${newState.currentHH?.toFixed(5)}, HL=${newState.currentHL?.toFixed(5)})`);
        }
      }
    } else if (isLow && currentCandle.close_price < (newState.currentLL || Infinity)) {
      // New LL formed (body close)
      console.log(`📉 New LL formed: ${currentCandle.close_price} (previous: ${newState.currentLL})`);
      
      const oldLLIndex = newState.structurePoints.findIndex(
        p => p.label === 'LL' && p.price === newState.currentLL
      );
      
      newState.currentLL = currentCandle.close_price;
      
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
    
    // After processing structure, check for recent-only bullish flip if LH is stale/missing
    if (!newState.currentLH || !isStructurePointRecent(
      findStructurePointIndex(newState.structurePoints, newState.currentLH, 'swing_high'),
      currentIndex,
      timeframe
    )) {
      const bullishFlip = detectRecentBullishFlip(newState, candles, currentIndex, timeframe, symbol);
      if (bullishFlip.shouldFlip && bullishFlip.recentHH && bullishFlip.recentHL) {
        console.log(`🧭 Recent-only bullish flip detected (LH stale/missing, checking recent structure)`);
        newState.trend = 'bullish';
        newState.currentHH = bullishFlip.recentHH.price;
        newState.currentHL = bullishFlip.recentHL.price;
        newState.currentLL = null;
        newState.currentLH = null;
        
        // Label the structure points
        bullishFlip.recentHH.label = 'HH';
        bullishFlip.recentHL.label = 'HL';
        
        console.log(`✅ Flipped to BULLISH via recent-only pattern (HH=${newState.currentHH?.toFixed(5)}, HL=${newState.currentHL?.toFixed(5)})`);
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
  else lookbackDate.setMonth(lookbackDate.getMonth() - 4);
  
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
    state = updateTrendState(state, candles, i, timeframe, symbol);
  }
  
  // Final consistency guard - ensure trend aligns with final price
  const lastCandle = candles[candles.length - 1];
  const finalClose = lastCandle.close_price;
  const pipSize = getPipSize(symbol);
  const bufferPips = getMinBufferPips(timeframe);
  const minBuffer = bufferPips * pipSize;
  
  // Debug consistency guard entry for GBPUSD 4H
  const isDebugPair = symbol === 'GBPUSD' && timeframe === '4H';
  if (isDebugPair) {
    console.log(`🔍 [${symbol} ${timeframe}] CONSISTENCY GUARD CHECK:`);
    console.log(`   Final trend: ${state.trend}`);
    console.log(`   Final close: ${finalClose}`);
    console.log(`   Current HL: ${state.currentHL}`);
    console.log(`   Min buffer: ${minBuffer} (${bufferPips} pips)`);
    console.log(`   Break condition check: ${finalClose} < ${state.currentHL ? state.currentHL - minBuffer : 'N/A'}`);
    console.log(`   Break condition result: ${state.trend === 'bullish' && state.currentHL && finalClose < state.currentHL - minBuffer}`);
  }
  
  if (state.trend === 'bullish' && state.currentHL && finalClose < state.currentHL - minBuffer) {
    // Check if HL is recent
    const hlIndex = findStructurePointIndex(state.structurePoints, state.currentHL, 'swing_low');
    const isHLRecent = hlIndex >= 0 ? isStructurePointRecent(hlIndex, candles.length - 1, timeframe) : false;
    const age = hlIndex >= 0 ? (candles.length - 1) - hlIndex : -1;
    
    // Enhanced debug for GBPUSD 4H
    if (isDebugPair) {
      console.log(`🚨 [${symbol} ${timeframe}] CONSISTENCY GUARD TRIGGERED:`);
      console.log(`   hlIndex from findStructurePointIndex: ${hlIndex}`);
      console.log(`   Age: ${age} candles`);
      console.log(`   isHLRecent: ${isHLRecent}`);
      console.log(`   Relevance window: ${Math.floor(candles.length * 0.1)} candles (10% of ${candles.length})`);
      console.log(`   Distance below HL: ${((state.currentHL - finalClose) / pipSize).toFixed(1)} pips`);
    }
    
    if (isHLRecent) {
      console.log(`⚠️  Consistency check: Flipping bullish to BEARISH (body ${finalClose} broke HL ${state.currentHL})`);
      state.trend = 'bearish';
      
      // Find preceding high to label as LH
      const precedingHigh = state.structurePoints
        .filter(p => p.type === 'swing_high' && p.index < candles.length - 1)
        .sort((a, b) => b.index - a.index)[0];
      
      if (precedingHigh) {
        precedingHigh.label = 'LH';
        state.currentLH = precedingHigh.price;
      }
      
      state.currentLL = finalClose;
      state.currentHH = null;
      state.currentHL = null;
    } else {
      // Before degrading to neutral, check for recent bearish pattern
      const bearishFlip = detectRecentBearishFlip(state, candles, candles.length - 1, timeframe, symbol);
      if (bearishFlip.shouldFlip && bearishFlip.recentLL && bearishFlip.recentLH) {
        console.log(`⚠️  Consistency check: Flipping to BEARISH via recent-only pattern (stale HL)`);
        state.trend = 'bearish';
        state.currentLL = bearishFlip.recentLL.price;
        state.currentLH = bearishFlip.recentLH.price;
        state.currentHH = null;
        state.currentHL = null;
        
        // Label the structure points
        bearishFlip.recentLL.label = 'LL';
        bearishFlip.recentLH.label = 'LH';
      } else {
        console.log(`⚠️  Consistency check: Degrading bullish trend to neutral (HL too old)`);
        state.trend = 'neutral';
      }
    }
  } else if (state.trend === 'bearish' && state.currentLH && finalClose > state.currentLH + minBuffer) {
    // Check if LH is recent
    const lhIndex = findStructurePointIndex(state.structurePoints, state.currentLH, 'swing_high');
    const isLHRecent = lhIndex >= 0 ? isStructurePointRecent(lhIndex, candles.length - 1, timeframe) : false;
    
    if (isLHRecent) {
      console.log(`⚠️  Consistency check: Flipping bearish to BULLISH (body ${finalClose} broke LH ${state.currentLH})`);
      state.trend = 'bullish';
      
      // Find preceding low to label as HL
      const precedingLow = state.structurePoints
        .filter(p => p.type === 'swing_low' && p.index < candles.length - 1)
        .sort((a, b) => b.index - a.index)[0];
      
      if (precedingLow) {
        precedingLow.label = 'HL';
        state.currentHL = precedingLow.price;
      }
      
      state.currentHH = finalClose;
      state.currentLL = null;
      state.currentLH = null;
    } else {
      // Before degrading to neutral, check for recent bullish pattern
      const bullishFlip = detectRecentBullishFlip(state, candles, candles.length - 1, timeframe, symbol);
      if (bullishFlip.shouldFlip && bullishFlip.recentHH && bullishFlip.recentHL) {
        console.log(`⚠️  Consistency check: Flipping to BULLISH via recent-only pattern (stale LH)`);
        state.trend = 'bullish';
        state.currentHH = bullishFlip.recentHH.price;
        state.currentHL = bullishFlip.recentHL.price;
        state.currentLL = null;
        state.currentLH = null;
        
        // Label the structure points
        bullishFlip.recentHH.label = 'HH';
        bullishFlip.recentHL.label = 'HL';
      } else {
        console.log(`⚠️  Consistency check: Degrading bearish trend to neutral (LH too old)`);
        state.trend = 'neutral';
      }
    }
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
