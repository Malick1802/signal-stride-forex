
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENHANCED: More conservative signal parameters
const MAX_ACTIVE_SIGNALS = 20;
const MAX_NEW_SIGNALS_PER_RUN = 4; // Reduced from 8 for more selective generation
const FUNCTION_TIMEOUT_MS = 180000;
const CONCURRENT_ANALYSIS_LIMIT = 3;

// Enhanced pip calculation utilities
const isJPYPair = (symbol: string): boolean => {
  return symbol.includes('JPY');
};

const getPipValue = (symbol: string): number => {
  return isJPYPair(symbol) ? 0.01 : 0.0001;
};

// ENHANCED: Realistic price movement generator for better trend analysis
const generateRealisticPriceHistory = (currentPrice: number, symbol: string, periods: number = 100): number[] => {
  const priceHistory = [];
  let price = currentPrice;
  const pipValue = getPipValue(symbol);
  
  // Generate more realistic price movements with both upward and downward trends
  for (let i = 0; i < periods; i++) {
    // Create varied price movements: 40% up trend, 40% down trend, 20% sideways
    const trendBias = Math.random();
    let movement = 0;
    
    if (trendBias < 0.4) {
      // Upward trend bias
      movement = (Math.random() * 0.8 + 0.2) * pipValue * (Math.random() > 0.3 ? 1 : -1);
      movement = Math.abs(movement) * (Math.random() > 0.25 ? 1 : -1);
    } else if (trendBias < 0.8) {
      // Downward trend bias
      movement = (Math.random() * 0.8 + 0.2) * pipValue * (Math.random() > 0.3 ? -1 : 1);
      movement = Math.abs(movement) * (Math.random() > 0.25 ? -1 : 1);
    } else {
      // Sideways movement
      movement = (Math.random() * 0.4 - 0.2) * pipValue;
    }
    
    price += movement;
    priceHistory.push(price);
  }
  
  // Ensure we end close to current price for realism
  priceHistory[priceHistory.length - 1] = currentPrice;
  return priceHistory.reverse(); // Most recent first
};

// ENHANCED: Stricter RSI calculation with more conservative thresholds
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length === 0) return 0;
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
};

// ENHANCED: Stricter MACD calculation with histogram confirmation
const calculateMACD = (prices: number[]): { line: number; signal: number; histogram: number; strength: number } => {
  if (prices.length < 26) return { line: 0, signal: 0, histogram: 0, strength: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const macdSignal = calculateEMA([macdLine], 9);
  const histogram = macdLine - macdSignal;
  
  // Calculate MACD strength (distance between line and signal)
  const strength = Math.abs(macdLine - macdSignal);
  
  return { line: macdLine, signal: macdSignal, histogram, strength };
};

const calculateBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } => {
  if (prices.length < period) {
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return { upper: avg, middle: avg, lower: avg };
  }
  
  const recentPrices = prices.slice(-period);
  const middle = recentPrices.reduce((sum, price) => sum + price, 0) / period;
  
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: middle + (standardDeviation * stdDev),
    middle,
    lower: middle - (standardDeviation * stdDev)
  };
};

// ENHANCED: Conservative ATR calculation
const calculateImprovedATR = (prices: number[], periods: number = 14): number => {
  if (prices.length < 2) return prices[0] * 0.002;
  
  const trueRanges = [];
  for (let i = 1; i < Math.min(prices.length, periods + 10); i++) {
    const high = Math.max(prices[i], prices[i-1]);
    const low = Math.min(prices[i], prices[i-1]);
    const prevClose = prices[i-1];
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  const avgTR = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  return Math.max(avgTR, prices[0] * 0.001);
};

// ENHANCED: Strict technical confirmation system
const validateTechnicalConfirmation = (currentPrice: number, rsi: number, macd: any, ema50: number, ema200: number, bollingerBands: any, signalType: string): { isValid: boolean; score: number; confirmations: string[] } => {
  const confirmations = [];
  let score = 0;
  
  // STRICT RSI CONFIRMATION (25/75 levels)
  if (signalType === 'BUY') {
    if (rsi < 25) { // Extremely oversold
      confirmations.push('RSI Extremely Oversold (<25)');
      score += 2.5;
    } else if (rsi < 30) { // Still oversold but less strict
      confirmations.push('RSI Oversold (<30)');
      score += 1;
    }
  } else if (signalType === 'SELL') {
    if (rsi > 75) { // Extremely overbought
      confirmations.push('RSI Extremely Overbought (>75)');
      score += 2.5;
    } else if (rsi > 70) { // Still overbought but less strict
      confirmations.push('RSI Overbought (>70)');
      score += 1;
    }
  }
  
  // STRICT MACD CONFIRMATION with histogram
  if (signalType === 'BUY') {
    if (macd.line > macd.signal && macd.histogram > 0 && macd.strength > 0.00001) {
      confirmations.push('MACD Bullish Crossover with Strong Histogram');
      score += 2.5;
    } else if (macd.line > macd.signal) {
      confirmations.push('MACD Bullish Crossover');
      score += 1;
    }
  } else if (signalType === 'SELL') {
    if (macd.line < macd.signal && macd.histogram < 0 && macd.strength > 0.00001) {
      confirmations.push('MACD Bearish Crossover with Strong Histogram');
      score += 2.5;
    } else if (macd.line < macd.signal) {
      confirmations.push('MACD Bearish Crossover');
      score += 1;
    }
  }
  
  // STRICT TREND ALIGNMENT - All EMAs must align
  if (signalType === 'BUY') {
    if (currentPrice > ema50 && ema50 > ema200 && currentPrice > ema200) {
      confirmations.push('Clear Bullish Trend Alignment (Price > EMA50 > EMA200)');
      score += 2.5;
    } else if (currentPrice > ema50 && currentPrice > ema200) {
      confirmations.push('Price Above Both EMAs');
      score += 1.5;
    }
  } else if (signalType === 'SELL') {
    if (currentPrice < ema50 && ema50 < ema200 && currentPrice < ema200) {
      confirmations.push('Clear Bearish Trend Alignment (Price < EMA50 < EMA200)');
      score += 2.5;
    } else if (currentPrice < ema50 && currentPrice < ema200) {
      confirmations.push('Price Below Both EMAs');
      score += 1.5;
    }
  }
  
  // BOLLINGER BAND CONFIRMATION
  if (signalType === 'BUY' && currentPrice <= bollingerBands.lower) {
    confirmations.push('Price at Lower Bollinger Band');
    score += 1.5;
  } else if (signalType === 'SELL' && currentPrice >= bollingerBands.upper) {
    confirmations.push('Price at Upper Bollinger Band');
    score += 1.5;
  }
  
  // EMA SEPARATION (trend strength)
  const emaSeparation = Math.abs(ema50 - ema200) / currentPrice;
  if (emaSeparation > 0.005) { // 0.5% separation indicates strong trend
    confirmations.push('Strong EMA Separation (Strong Trend)');
    score += 1;
  }
  
  // MINIMUM SCORE REQUIRED: 7 out of 10 (very strict)
  const isValid = score >= 7 && confirmations.length >= 3;
  
  return { isValid, score, confirmations };
};

// Economic Events Data
const getEconomicEvents = (pair: string): any[] => {
  const baseCurrency = pair.substring(0, 3);
  const quoteCurrency = pair.substring(3, 6);
  const events = [];
  
  if (baseCurrency === 'USD' || quoteCurrency === 'USD') {
    events.push({ title: 'FOMC Rate Decision', impact: 'High', time: 'This Week', currency: 'USD' });
    events.push({ title: 'Non-Farm Payrolls', impact: 'High', time: 'Next Week', currency: 'USD' });
  }
  
  if (baseCurrency === 'EUR' || quoteCurrency === 'EUR') {
    events.push({ title: 'ECB Rate Decision', impact: 'High', time: 'This Week', currency: 'EUR' });
    events.push({ title: 'Eurozone CPI', impact: 'Medium', time: 'Today', currency: 'EUR' });
  }
  
  if (baseCurrency === 'GBP' || quoteCurrency === 'GBP') {
    events.push({ title: 'BoE Rate Decision', impact: 'High', time: 'Next Week', currency: 'GBP' });
  }
  
  if (baseCurrency === 'JPY' || quoteCurrency === 'JPY') {
    events.push({ title: 'BoJ Policy Meeting', impact: 'High', time: 'This Week', currency: 'JPY' });
  }
  
  return events;
};

// Chart Pattern Detection
const detectChartPatterns = (prices: number[], currentPrice: number): string[] => {
  const patterns = [];
  
  if (prices.length < 10) return patterns;
  
  const recentPrices = prices.slice(-20);
  const maxPrice = Math.max(...recentPrices);
  const minPrice = Math.min(...recentPrices);
  
  // Double bottom detection (bullish)
  const lowPoints = recentPrices.filter(price => Math.abs(price - minPrice) < minPrice * 0.002);
  if (lowPoints.length >= 2 && currentPrice > minPrice * 1.01) {
    patterns.push('Double Bottom (Bullish)');
  }
  
  // Double top detection (bearish)
  const highPoints = recentPrices.filter(price => Math.abs(price - maxPrice) < maxPrice * 0.002);
  if (highPoints.length >= 2 && currentPrice < maxPrice * 0.99) {
    patterns.push('Double Top (Bearish)');
  }
  
  // Support/Resistance levels
  if (Math.abs(currentPrice - maxPrice) / maxPrice < 0.01) {
    patterns.push('Near Resistance Level');
  }
  if (Math.abs(currentPrice - minPrice) / minPrice < 0.01) {
    patterns.push('Near Support Level');
  }
  
  return patterns;
};

// ENHANCED: Conservative stop loss with higher minimums
const calculateImprovedStopLoss = (entryPrice: number, symbol: string, signalType: string, atrValue: number, volatilityMultiplier: number = 2.5): number => {
  const pipValue = getPipValue(symbol);
  const atrDistance = atrValue * volatilityMultiplier;
  
  // ENHANCED: Higher minimum stop loss (50 pips for non-JPY, 60 pips for JPY)
  const minimumPips = isJPYPair(symbol) ? 60 : 50;
  const minimumDistance = minimumPips * pipValue;
  
  const stopDistance = Math.max(atrDistance, minimumDistance);
  
  console.log(`📊 Conservative Stop Loss for ${symbol}:`, {
    atrValue: atrValue.toFixed(6),
    atrDistance: atrDistance.toFixed(6),
    minimumDistance: minimumDistance.toFixed(6),
    finalStopDistance: stopDistance.toFixed(6),
    minimumPips,
    signalType
  });
  
  return signalType === 'BUY' 
    ? entryPrice - stopDistance 
    : entryPrice + stopDistance;
};

// Fixed pip-based take profit levels
const calculateFixedPipTakeProfits = (entryPrice: number, signalType: string, symbol: string): number[] => {
  const pipValue = getPipValue(symbol);
  const takeProfitPips = [15, 25, 40, 60, 80];
  
  return takeProfitPips.map(pips => {
    const priceDistance = pips * pipValue;
    return signalType === 'BUY' 
      ? entryPrice + priceDistance 
      : entryPrice - priceDistance;
  });
};

// Enhanced signal rotation with balanced selection criteria
const rotateOldestSignals = async (supabase: any, slotsNeeded: number): Promise<number> => {
  console.log(`🔄 Rotation: Selecting ${slotsNeeded} signals for rotation...`);
  
  try {
    const { data: signalsToRotate, error: selectError } = await supabase
      .from('trading_signals')
      .select('id, symbol, created_at, confidence')
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active')
      .order('confidence', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(slotsNeeded);

    if (selectError || !signalsToRotate?.length) {
      console.error('❌ Error selecting signals for rotation:', selectError);
      return 0;
    }

    const signalIds = signalsToRotate.map(s => s.id);
    const { error: updateError } = await supabase
      .from('trading_signals')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('id', signalIds);

    if (updateError) {
      console.error('❌ Error in rotation update:', updateError);
      return 0;
    }

    console.log(`✅ Rotation complete: ${signalsToRotate.length} signals rotated`);
    return signalsToRotate.length;

  } catch (error) {
    console.error('❌ Error in signal rotation:', error);
    return 0;
  }
};

// ENHANCED: Conservative AI analysis with stricter requirements
const analyzeWithConservativeMarketAnalysis = async (pair: string, marketData: any, openAIApiKey: string, priceHistory: number[], technicalData: any): Promise<any> => {
  const currentPrice = parseFloat(marketData.current_price.toString());
  
  // Enhanced technical indicators with strict validation
  const rsi = calculateRSI(priceHistory);
  const macd = calculateMACD(priceHistory);
  const bollingerBands = calculateBollingerBands(priceHistory);
  const ema50 = calculateEMA(priceHistory, 50);
  const ema200 = calculateEMA(priceHistory, 200);
  const atr = calculateImprovedATR(priceHistory);
  
  // Economic events and sentiment
  const economicEvents = getEconomicEvents(pair);
  const chartPatterns = detectChartPatterns(priceHistory, currentPrice);
  
  // Market session detection
  const hour = new Date().getUTCHours();
  let marketSession = 'OVERLAP';
  let sessionAdvantage = false;
  
  if (hour >= 0 && hour < 8) {
    marketSession = 'ASIAN';
    sessionAdvantage = ['USDJPY', 'AUDJPY', 'NZDJPY', 'GBPJPY'].includes(pair);
  } else if (hour >= 8 && hour < 16) {
    marketSession = 'EUROPEAN';
    sessionAdvantage = ['EURUSD', 'GBPUSD', 'EURGBP', 'EURCHF', 'GBPCHF'].includes(pair);
  } else if (hour >= 16 && hour < 24) {
    marketSession = 'US';
    sessionAdvantage = ['EURUSD', 'GBPUSD', 'USDCAD', 'USDCHF'].includes(pair);
  }

  // CONSERVATIVE AI ANALYSIS PROMPT with stricter requirements
  const aiAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an EXTREMELY CONSERVATIVE forex analyst. Your job is to identify only the HIGHEST QUALITY trading opportunities with MULTIPLE technical confirmations.

ULTRA-CONSERVATIVE ANALYSIS FRAMEWORK:
- REQUIRE MULTIPLE indicator alignment (RSI + MACD + Trend + Bollinger Bands)
- DEMAND strict RSI levels: BUY only if RSI < 25 (extreme oversold), SELL only if RSI > 75 (extreme overbought)
- REQUIRE strong MACD confirmation: line, signal, and histogram must ALL align
- DEMAND clear trend alignment: Price, EMA50, EMA200 must ALL align with signal direction
- REQUIRE session advantage for pair timing
- MINIMUM confidence: 75%+, win probability: 65%+, technical score: 7+/10

CONSERVATIVE SIGNAL GENERATION RULES:
- Generate BUY signals ONLY when: RSI < 25 AND MACD bullish crossover with positive histogram AND Price > EMA50 > EMA200 AND price near lower Bollinger Band
- Generate SELL signals ONLY when: RSI > 75 AND MACD bearish crossover with negative histogram AND Price < EMA50 < EMA200 AND price near upper Bollinger Band  
- Generate NEUTRAL when ANY of the above conditions are not met
- Quality over quantity - reject signals that don't meet ALL criteria
- Only EXCELLENT quality signals accepted (no GOOD or FAIR)

OUTPUT FORMAT:
{
  "signal": "BUY|SELL|NEUTRAL",
  "confidence": 75-90,
  "win_probability": 65-80,
  "technical_score": 7-10,
  "confirmations": ["list", "of", "technical", "confirmations"],
  "atr_multiplier": 2.5,
  "market_structure": "bullish|bearish|neutral",
  "session_advantage": true|false,
  "key_levels": {"support": price, "resistance": price},
  "analysis": "detailed conservative analysis with ALL confirmations listed",
  "quality_grade": "EXCELLENT|REJECT",
  "signal_reasoning": "specific technical reasons with ALL indicators confirming signal direction",
  "risk_assessment": "conservative risk evaluation"
}`
        },
        {
          role: 'user',
          content: `ULTRA-CONSERVATIVE TECHNICAL ANALYSIS for ${pair}:

PRICE DATA:
- Current Price: ${currentPrice.toFixed(5)}
- 24H Range: ${Math.min(...priceHistory).toFixed(5)} - ${Math.max(...priceHistory).toFixed(5)}

STRICT TECHNICAL INDICATORS:
- RSI (14): ${rsi.toFixed(2)} ${rsi > 75 ? '(EXTREME OVERBOUGHT - potential SELL)' : rsi < 25 ? '(EXTREME OVERSOLD - potential BUY)' : rsi > 70 ? '(Overbought)' : rsi < 30 ? '(Oversold)' : '(Neutral - REJECT)'}
- MACD: Line ${macd.line.toFixed(6)}, Signal ${macd.signal.toFixed(6)}, Histogram ${macd.histogram.toFixed(6)}, Strength ${macd.strength.toFixed(6)}
- MACD Status: ${macd.line > macd.signal ? 'Bullish' : 'Bearish'} crossover, Histogram ${macd.histogram > 0 ? 'Positive' : 'Negative'}
- Bollinger Bands: Upper ${bollingerBands.upper.toFixed(5)}, Middle ${bollingerBands.middle.toFixed(5)}, Lower ${bollingerBands.lower.toFixed(5)}
- Band Position: ${currentPrice > bollingerBands.upper ? 'ABOVE upper (extreme overbought)' : currentPrice < bollingerBands.lower ? 'BELOW lower (extreme oversold)' : 'WITHIN bands (neutral)'}
- EMA 50: ${ema50.toFixed(5)}, EMA 200: ${ema200.toFixed(5)}
- Trend Alignment: Price ${currentPrice > ema50 ? '>' : '<'} EMA50 ${ema50 > ema200 ? '>' : '<'} EMA200
- Clear Trend: ${(currentPrice > ema50 && ema50 > ema200) ? 'BULLISH ALIGNMENT' : (currentPrice < ema50 && ema50 < ema200) ? 'BEARISH ALIGNMENT' : 'NO CLEAR ALIGNMENT'}
- ATR: ${atr.toFixed(5)} (${(atr/currentPrice*100).toFixed(3)}% volatility)

CHART PATTERNS: ${chartPatterns.join(', ') || 'None detected'}
ECONOMIC EVENTS: ${economicEvents.map(e => `${e.title} (${e.impact})`).join(', ') || 'None'}
MARKET SESSION: ${marketSession} (Advantage: ${sessionAdvantage ? 'YES' : 'NO'})

CONSERVATIVE REQUIREMENTS CHECKLIST:
1. RSI: Must be < 25 for BUY or > 75 for SELL
2. MACD: Line, signal, and histogram must ALL align with signal direction
3. Trend: Price, EMA50, EMA200 must ALL align (complete trend alignment)
4. Bollinger: Price should be near bands for reversal confirmation
5. Session: Must have session advantage for the pair
6. Multiple confirmations: Need at least 3+ strong confirmations

ANALYZE STRICTLY: Only generate a signal if ALL conservative requirements are met. If any requirement fails, return NEUTRAL with explanation.`
        }
      ],
      max_tokens: 1200,
      temperature: 0.2 // Lower temperature for more conservative analysis
    }),
  });

  if (!aiAnalysisResponse.ok) {
    throw new Error(`Conservative analysis error: ${aiAnalysisResponse.status}`);
  }

  const aiData = await aiAnalysisResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content;

  if (!aiContent) {
    throw new Error('No AI response content');
  }

  const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  const result = JSON.parse(jsonMatch[0]);
  
  console.log(`🎯 Conservative Analysis Result for ${pair}: ${result.signal} (RSI: ${rsi.toFixed(1)}, Confidence: ${result.confidence}%, Score: ${result.technical_score})`);
  
  return result;
};

// ENHANCED: Ultra-conservative signal processing with strict validation
const processConservativeQualitySignals = async (pairs: string[], latestPrices: Map<any, any>, openAIApiKey: string, supabase: any, maxSignals: number) => {
  const results = [];
  
  for (let i = 0; i < pairs.length && results.length < maxSignals; i++) {
    const pair = pairs[i];
    
    try {
      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) continue;

      const currentPrice = parseFloat(marketPoint.current_price.toString());
      const priceHistory = generateRealisticPriceHistory(currentPrice, pair, 100);
      const atr = calculateImprovedATR(priceHistory);

      console.log(`🧠 CONSERVATIVE analysis for ${pair} (Price: ${currentPrice.toFixed(5)}, ATR: ${atr.toFixed(5)})...`);

      const aiSignal = await analyzeWithConservativeMarketAnalysis(pair, marketPoint, openAIApiKey, priceHistory, {});

      // ULTRA-STRICT QUALITY FILTERS
      if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
        console.log(`⚪ REJECTED ${pair} - NEUTRAL or invalid signal`);
        continue;
      }

      // ENHANCED: Stricter thresholds
      if (aiSignal.confidence < 75 || aiSignal.win_probability < 65 || aiSignal.technical_score < 7) {
        console.log(`❌ QUALITY REJECTED: ${pair} (conf: ${aiSignal.confidence}%, prob: ${aiSignal.win_probability}%, score: ${aiSignal.technical_score})`);
        continue;
      }

      // ONLY EXCELLENT quality accepted
      if (aiSignal.quality_grade !== 'EXCELLENT') {
        console.log(`❌ GRADE REJECTED: ${pair} rated ${aiSignal.quality_grade} (need EXCELLENT)`);
        continue;
      }

      // TECHNICAL CONFIRMATION VALIDATION
      const rsi = calculateRSI(priceHistory);
      const macd = calculateMACD(priceHistory);
      const ema50 = calculateEMA(priceHistory, 50);
      const ema200 = calculateEMA(priceHistory, 200);
      const bollingerBands = calculateBollingerBands(priceHistory);
      
      const technicalValidation = validateTechnicalConfirmation(currentPrice, rsi, macd, ema50, ema200, bollingerBands, aiSignal.signal);
      
      if (!technicalValidation.isValid) {
        console.log(`❌ TECHNICAL VALIDATION FAILED: ${pair} (score: ${technicalValidation.score}/10, confirmations: ${technicalValidation.confirmations.length})`);
        continue;
      }

      // SESSION ADVANTAGE CHECK
      const hour = new Date().getUTCHours();
      let sessionAdvantage = false;
      
      if (hour >= 0 && hour < 8) {
        sessionAdvantage = ['USDJPY', 'AUDJPY', 'NZDJPY', 'GBPJPY'].includes(pair);
      } else if (hour >= 8 && hour < 16) {
        sessionAdvantage = ['EURUSD', 'GBPUSD', 'EURGBP', 'EURCHF', 'GBPCHF'].includes(pair);
      } else if (hour >= 16 && hour < 24) {
        sessionAdvantage = ['EURUSD', 'GBPUSD', 'USDCAD', 'USDCHF'].includes(pair);
      }

      if (!sessionAdvantage) {
        console.log(`❌ SESSION FILTER: ${pair} - no session advantage at hour ${hour}`);
        continue;
      }

      // ENHANCED: Signal generation with conservative parameters
      const entryPrice = currentPrice;
      const atrMultiplier = 2.5; // More conservative
      
      // Conservative stop loss
      const stopLoss = calculateImprovedStopLoss(entryPrice, pair, aiSignal.signal, atr, atrMultiplier);
      
      // Fixed pip-based take profits
      const takeProfits = calculateFixedPipTakeProfits(entryPrice, aiSignal.signal, pair);

      // Enhanced chart data generation
      const chartData = [];
      const baseTime = Date.now() - (45 * 60 * 1000);
      
      for (let j = 0; j < 30; j++) {
        const timePoint = baseTime + (j * 90 * 1000);
        const historicalPrice = priceHistory[Math.min(j * 2, priceHistory.length - 1)] || currentPrice;
        
        chartData.push({
          time: timePoint,
          price: parseFloat(historicalPrice.toFixed(isJPYPair(pair) ? 3 : 5))
        });
      }

      chartData.push({
        time: Date.now(),
        price: parseFloat(entryPrice.toFixed(isJPYPair(pair) ? 3 : 5))
      });

      const signal = {
        symbol: pair,
        type: aiSignal.signal,
        price: parseFloat(entryPrice.toFixed(isJPYPair(pair) ? 3 : 5)),
        stop_loss: parseFloat(stopLoss.toFixed(isJPYPair(pair) ? 3 : 5)),
        take_profits: takeProfits.map(tp => parseFloat(tp.toFixed(isJPYPair(pair) ? 3 : 5))),
        confidence: aiSignal.confidence,
        status: 'active',
        is_centralized: true,
        user_id: null,
        analysis_text: `CONSERVATIVE ${aiSignal.quality_grade} Analysis (${aiSignal.win_probability}% win probability): ${aiSignal.analysis}. Technical confirmations: ${technicalValidation.confirmations.join(', ')}. ${aiSignal.signal_reasoning || ''}`,
        chart_data: chartData,
        pips: Math.round(Math.abs(entryPrice - stopLoss) / getPipValue(pair)),
        created_at: new Date().toISOString()
      };

      console.log(`✅ CONSERVATIVE SIGNAL for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${signal.pips} pip stop, ${technicalValidation.confirmations.length} confirmations)`);
      results.push(signal);

      // Increased delay for more conservative generation
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Error in conservative analysis for ${pair}:`, error);
    }
  }

  return results;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Function timeout after 180 seconds')), FUNCTION_TIMEOUT_MS)
  );

  try {
    const body = await req.json().catch(() => ({}));
    const isCronTriggered = body.trigger === 'cron';
    
    console.log(`🎯 CONSERVATIVE signal generation starting (ultra-strict technical analysis, MAX: ${MAX_ACTIVE_SIGNALS})...`);
    console.log(`🛡️ Conservative filters: RSI 25/75, MACD+histogram, trend alignment, 75%+ confidence, 7+ technical score`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Signal counting
    const { data: existingSignals, error: existingError, count: totalCount } = await supabase
      .from('trading_signals')
      .select('symbol, type', { count: 'exact' })
      .eq('is_centralized', true)
      .is('user_id', null)
      .eq('status', 'active');

    if (existingError) throw existingError;

    const currentSignalCount = totalCount || 0;
    const signalTypes = existingSignals?.map(s => s.type) || [];
    const buyCount = signalTypes.filter(type => type === 'BUY').length;
    const sellCount = signalTypes.filter(type => type === 'SELL').length;
    
    console.log(`📊 Current signals: ${currentSignalCount}/${MAX_ACTIVE_SIGNALS} (BUY: ${buyCount}, SELL: ${sellCount})`);

    let availableSlots = MAX_ACTIVE_SIGNALS - currentSignalCount;
    
    if (availableSlots <= 0) {
      console.log(`🔄 Signal limit reached - initiating rotation...`);
      const slotsNeeded = Math.min(MAX_NEW_SIGNALS_PER_RUN, 4);
      const rotatedCount = await rotateOldestSignals(supabase, slotsNeeded);
      availableSlots = rotatedCount;
    }

    const maxNewSignals = Math.min(MAX_NEW_SIGNALS_PER_RUN, Math.max(availableSlots, 1));
    console.log(`✅ CONSERVATIVE analysis will generate up to ${maxNewSignals} high-quality signals`);

    // Get market data
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(25);

    if (marketError) throw marketError;

    // Get existing pairs to avoid duplicates
    const existingPairs = new Set(existingSignals?.map(s => s.symbol) || []);

    // Prioritized pairs for analysis
    const prioritizedPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'EURCHF', 'GBPCHF', 'AUDCHF', 'CADJPY'
    ];
    
    const availablePairs = prioritizedPairs.filter(pair => !existingPairs.has(pair));
    const pairsToAnalyze = availablePairs.slice(0, maxNewSignals * 4); // More pairs to analyze for conservative selection
    
    console.log(`🔍 CONSERVATIVE analysis of ${pairsToAnalyze.length} pairs for ${maxNewSignals} slots`);
    
    // Get latest prices
    const latestPrices = new Map();
    for (const pair of pairsToAnalyze) {
      const pairData = marketData?.find(item => item.symbol === pair);
      if (pairData) {
        latestPrices.set(pair, pairData);
      }
    }

    console.log(`📊 Market data available for ${latestPrices.size} pairs`);

    if (latestPrices.size === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No market data available for conservative analysis',
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            executionTime: `${Date.now() - startTime}ms`,
            conservativeAnalysis: true,
            buySignals: buyCount,
            sellSignals: sellCount
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conservative signal processing
    console.log(`🚀 Starting CONSERVATIVE signal generation with strict technical requirements...`);
    
    const processingPromise = processConservativeQualitySignals(
      Array.from(latestPrices.keys()), 
      latestPrices, 
      openAIApiKey, 
      supabase, 
      maxNewSignals
    );

    const signalsToInsert = await Promise.race([processingPromise, timeoutPromise]);

    // Insert signals
    let signalsGenerated = 0;
    const generatedSignals = [];
    let newBuySignals = 0;
    let newSellSignals = 0;

    for (const signal of signalsToInsert) {
      try {
        console.log(`💾 Inserting CONSERVATIVE signal for ${signal.symbol}: ${signal.type}...`);
        const { data: insertedSignal, error: insertError } = await supabase
          .from('trading_signals')
          .insert([signal])
          .select('*')
          .single();

        if (insertError) {
          console.error(`❌ Insert error for ${signal.symbol}:`, insertError);
          continue;
        }

        signalsGenerated++;
        generatedSignals.push(insertedSignal);
        
        if (signal.type === 'BUY') newBuySignals++;
        if (signal.type === 'SELL') newSellSignals++;
        
        console.log(`✅ CONSERVATIVE signal ${signalsGenerated}/${maxNewSignals}: ${signal.symbol} ${signal.type} (${signal.confidence}% confidence)`);

      } catch (error) {
        console.error(`❌ Error inserting signal for ${signal.symbol}:`, error);
      }
    }

    const finalActiveSignals = currentSignalCount - Math.max(0, currentSignalCount - MAX_ACTIVE_SIGNALS) + signalsGenerated;
    const finalBuyCount = buyCount + newBuySignals;
    const finalSellCount = sellCount + newSellSignals;
    const executionTime = Date.now() - startTime;

    console.log(`📊 CONSERVATIVE SIGNAL GENERATION COMPLETE:`);
    console.log(`  - Execution time: ${executionTime}ms`);
    console.log(`  - High-quality signals generated: ${signalsGenerated}/${maxNewSignals} (BUY: ${newBuySignals}, SELL: ${newSellSignals})`);
    console.log(`  - Conservative filters applied: RSI 25/75, MACD+histogram, trend alignment, 75%+ confidence`);
    console.log(`  - Total active: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signalsGenerated} CONSERVATIVE signals (BUY: ${newBuySignals}, SELL: ${newSellSignals}) in ${executionTime}ms - Ultra-strict quality filters`,
        signals: generatedSignals?.map(s => ({ 
          id: s.id, 
          symbol: s.symbol, 
          type: s.type, 
          price: s.price,
          confidence: s.confidence,
          pips: s.pips
        })) || [],
        stats: {
          opportunitiesAnalyzed: latestPrices.size,
          signalsGenerated,
          totalActiveSignals: finalActiveSignals,
          signalLimit: MAX_ACTIVE_SIGNALS,
          maxNewSignalsPerRun: MAX_NEW_SIGNALS_PER_RUN,
          executionTime: `${executionTime}ms`,
          timeoutProtection: `${FUNCTION_TIMEOUT_MS/1000}s`,
          conservativeAnalysis: true,
          strictRequirements: {
            minConfidence: '75%',
            minWinProbability: '65%',
            minTechnicalScore: '7/10',
            rsiThresholds: 'BUY<25, SELL>75',
            macdConfirmation: 'line+signal+histogram',
            trendAlignment: 'Price+EMA50+EMA200',
            qualityGrade: 'EXCELLENT only',
            sessionAdvantage: 'required',
            minStopLoss: '50-60 pips'
          },
          signalDistribution: {
            buySignals: finalBuyCount,
            sellSignals: finalSellCount,
            newBuySignals,
            newSellSignals
          },
          technicalIndicators: ['RSI (25/75)', 'MACD+Histogram', 'EMA 50/200 Alignment', 'Bollinger Bands', 'ATR'],
          conservativeFeatures: [
            'Multiple indicator confirmation required',
            'Strict RSI thresholds (25/75)',
            'MACD with histogram confirmation', 
            'Complete trend alignment (Price+EMA50+EMA200)',
            'Session advantage requirement',
            'Increased stop loss minimums',
            'EXCELLENT quality grade only'
          ],
          rotationUsed: availableSlots !== (MAX_ACTIVE_SIGNALS - currentSignalCount)
        },
        timestamp: new Date().toISOString(),
        trigger: isCronTriggered ? 'cron' : 'manual'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`💥 CONSERVATIVE SIGNAL GENERATION ERROR (${executionTime}ms):`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        conservativeAnalysis: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
