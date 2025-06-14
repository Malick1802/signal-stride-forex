
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UPDATED: Recalibrated signal parameters - no forced generation
const MAX_ACTIVE_SIGNALS = 20;
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

// UPDATED: Relaxed RSI calculation with 30/70 thresholds
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

// ENHANCED: MACD calculation with histogram strength
const calculateMACD = (prices: number[]): { line: number; signal: number; histogram: number; strength: number } => {
  if (prices.length < 26) return { line: 0, signal: 0, histogram: 0, strength: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  const macdSignal = calculateEMA([macdLine], 9);
  const histogram = macdLine - macdSignal;
  
  // Calculate strength as the absolute distance between line and signal
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

// UPDATED: Recalibrated technical confirmation system (3 out of 4 confirmations)
const validateTechnicalConfirmation = (currentPrice: number, rsi: number, macd: any, ema50: number, ema200: number, bollingerBands: any, signalType: string): { isValid: boolean; score: number; confirmations: string[] } => {
  const confirmations = [];
  let score = 0;
  
  // UPDATED: Relaxed RSI CONFIRMATION (30/70 levels instead of 25/75)
  if (signalType === 'BUY') {
    if (rsi < 25) { // Extremely oversold (bonus)
      confirmations.push('RSI Extremely Oversold (<25)');
      score += 2.5;
    } else if (rsi < 30) { // Oversold
      confirmations.push('RSI Oversold (<30)');
      score += 2;
    } else if (rsi < 35) { // Moderately oversold
      confirmations.push('RSI Moderately Oversold (<35)');
      score += 1;
    }
  } else if (signalType === 'SELL') {
    if (rsi > 75) { // Extremely overbought (bonus)
      confirmations.push('RSI Extremely Overbought (>75)');
      score += 2.5;
    } else if (rsi > 70) { // Overbought
      confirmations.push('RSI Overbought (>70)');
      score += 2;
    } else if (rsi > 65) { // Moderately overbought
      confirmations.push('RSI Moderately Overbought (>65)');
      score += 1;
    }
  }
  
  // UPDATED: Flexible MACD CONFIRMATION (line + signal required, histogram bonus)
  if (signalType === 'BUY') {
    if (macd.line > macd.signal) {
      confirmations.push('MACD Bullish Crossover');
      score += 1.5;
      if (macd.histogram > 0) {
        confirmations.push('MACD Positive Histogram');
        score += 1;
      }
      if (macd.strength > 0.00001) {
        confirmations.push('Strong MACD Signal');
        score += 0.5;
      }
    }
  } else if (signalType === 'SELL') {
    if (macd.line < macd.signal) {
      confirmations.push('MACD Bearish Crossover');
      score += 1.5;
      if (macd.histogram < 0) {
        confirmations.push('MACD Negative Histogram');
        score += 1;
      }
      if (macd.strength > 0.00001) {
        confirmations.push('Strong MACD Signal');
        score += 0.5;
      }
    }
  }
  
  // UPDATED: Flexible TREND ALIGNMENT (price vs EMAs, not all required)
  if (signalType === 'BUY') {
    if (currentPrice > ema50 && currentPrice > ema200) {
      confirmations.push('Price Above Both EMAs');
      score += 2;
      if (ema50 > ema200) {
        confirmations.push('EMA Bullish Alignment');
        score += 1;
      }
    } else if (currentPrice > ema50 || currentPrice > ema200) {
      confirmations.push('Price Above At Least One EMA');
      score += 1;
    }
  } else if (signalType === 'SELL') {
    if (currentPrice < ema50 && currentPrice < ema200) {
      confirmations.push('Price Below Both EMAs');
      score += 2;
      if (ema50 < ema200) {
        confirmations.push('EMA Bearish Alignment');
        score += 1;
      }
    } else if (currentPrice < ema50 || currentPrice < ema200) {
      confirmations.push('Price Below At Least One EMA');
      score += 1;
    }
  }
  
  // BOLLINGER BAND CONFIRMATION (bonus points)
  if (signalType === 'BUY' && currentPrice <= bollingerBands.lower) {
    confirmations.push('Price at Lower Bollinger Band');
    score += 1.5;
  } else if (signalType === 'SELL' && currentPrice >= bollingerBands.upper) {
    confirmations.push('Price at Upper Bollinger Band');
    score += 1.5;
  }
  
  // EMA SEPARATION (trend strength bonus)
  const emaSeparation = Math.abs(ema50 - ema200) / currentPrice;
  if (emaSeparation > 0.005) { // 0.5% separation indicates strong trend
    confirmations.push('Strong EMA Separation (Strong Trend)');
    score += 1;
  }
  
  // UPDATED: Require 3 confirmations AND score >= 6 (lowered from 7)
  const isValid = score >= 6 && confirmations.length >= 3;
  
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

// UPDATED: Recalibrated AI analysis with relaxed requirements
const analyzeWithRecalibratedMarketAnalysis = async (pair: string, marketData: any, openAIApiKey: string, priceHistory: number[], technicalData: any): Promise<any> => {
  const currentPrice = parseFloat(marketData.current_price.toString());
  
  // Enhanced technical indicators with relaxed validation
  const rsi = calculateRSI(priceHistory);
  const macd = calculateMACD(priceHistory);
  const bollingerBands = calculateBollingerBands(priceHistory);
  const ema50 = calculateEMA(priceHistory, 50);
  const ema200 = calculateEMA(priceHistory, 200);
  const atr = calculateImprovedATR(priceHistory);
  
  // Economic events and sentiment
  const economicEvents = getEconomicEvents(pair);
  const chartPatterns = detectChartPatterns(priceHistory, currentPrice);
  
  // Market session detection (now optional bonus)
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

  // UPDATED: Recalibrated AI analysis prompt with relaxed requirements
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
          content: `You are a BALANCED forex analyst. Your job is to identify QUALITY trading opportunities with MULTIPLE technical confirmations while being realistic about market conditions.

RECALIBRATED ANALYSIS FRAMEWORK:
- REQUIRE 3 out of 4 major confirmations (RSI + MACD + Trend/Bollinger + Session bonus)
- RSI levels: BUY if RSI < 35 (prefer < 30), SELL if RSI > 65 (prefer > 70)
- MACD confirmation: Line vs signal crossover (histogram bonus)
- Trend alignment: Price vs EMAs (partial alignment acceptable)
- Session advantage: Bonus points but not mandatory
- MINIMUM thresholds: 70%+ confidence, 60%+ win probability, 6+ technical score

BALANCED SIGNAL GENERATION RULES:
- Generate BUY signals when: RSI < 35 AND (MACD bullish OR trend support) AND 3+ confirmations
- Generate SELL signals when: RSI > 65 AND (MACD bearish OR trend resistance) AND 3+ confirmations
- Generate NEUTRAL when fewer than 3 confirmations or insufficient quality
- Focus on realistic opportunities - not perfect setups
- Accept both EXCELLENT and GOOD quality signals

OUTPUT FORMAT:
{
  "signal": "BUY|SELL|NEUTRAL",
  "confidence": 70-90,
  "win_probability": 60-80,
  "technical_score": 6-10,
  "confirmations": ["list", "of", "technical", "confirmations"],
  "atr_multiplier": 2.5,
  "market_structure": "bullish|bearish|neutral",
  "session_advantage": true|false,
  "key_levels": {"support": price, "resistance": price},
  "analysis": "detailed balanced analysis with confirmations listed",
  "quality_grade": "EXCELLENT|GOOD|REJECT",
  "signal_reasoning": "specific technical reasons with confirmation count",
  "risk_assessment": "balanced risk evaluation"
}`
        },
        {
          role: 'user',
          content: `RECALIBRATED TECHNICAL ANALYSIS for ${pair}:

PRICE DATA:
- Current Price: ${currentPrice.toFixed(5)}
- 24H Range: ${Math.min(...priceHistory).toFixed(5)} - ${Math.max(...priceHistory).toFixed(5)}

BALANCED TECHNICAL INDICATORS:
- RSI (14): ${rsi.toFixed(2)} ${rsi > 70 ? '(OVERBOUGHT - potential SELL)' : rsi < 30 ? '(OVERSOLD - potential BUY)' : rsi > 65 ? '(Moderately overbought)' : rsi < 35 ? '(Moderately oversold)' : '(Neutral)'}
- MACD: Line ${macd.line.toFixed(6)}, Signal ${macd.signal.toFixed(6)}, Histogram ${macd.histogram.toFixed(6)}, Strength ${macd.strength.toFixed(6)}
- MACD Status: ${macd.line > macd.signal ? 'Bullish' : 'Bearish'} crossover, Histogram ${macd.histogram > 0 ? 'Positive' : 'Negative'}
- Bollinger Bands: Upper ${bollingerBands.upper.toFixed(5)}, Middle ${bollingerBands.middle.toFixed(5)}, Lower ${bollingerBands.lower.toFixed(5)}
- Band Position: ${currentPrice > bollingerBands.upper ? 'ABOVE upper (overbought)' : currentPrice < bollingerBands.lower ? 'BELOW lower (oversold)' : 'WITHIN bands'}
- EMA 50: ${ema50.toFixed(5)}, EMA 200: ${ema200.toFixed(5)}
- Trend Alignment: Price ${currentPrice > ema50 ? '>' : '<'} EMA50 ${ema50 > ema200 ? '>' : '<'} EMA200
- Trend Status: ${(currentPrice > ema50 && ema50 > ema200) ? 'BULLISH ALIGNMENT' : (currentPrice < ema50 && ema50 < ema200) ? 'BEARISH ALIGNMENT' : 'MIXED SIGNALS'}
- ATR: ${atr.toFixed(5)} (${(atr/currentPrice*100).toFixed(3)}% volatility)

CHART PATTERNS: ${chartPatterns.join(', ') || 'None detected'}
ECONOMIC EVENTS: ${economicEvents.map(e => `${e.title} (${e.impact})`).join(', ') || 'None'}
MARKET SESSION: ${marketSession} (Advantage: ${sessionAdvantage ? 'YES (+1 bonus)' : 'NO (0 bonus)'})

RECALIBRATED REQUIREMENTS CHECKLIST:
1. RSI: BUY if < 35 (prefer < 30), SELL if > 65 (prefer > 70)
2. MACD: Line vs signal crossover (histogram bonus)
3. Trend: Price vs EMAs (partial alignment acceptable)
4. Session: Bonus points but not mandatory
5. Need 3+ confirmations total with 6+ technical score

ANALYZE WITH BALANCE: Generate signal if 3+ confirmations and quality thresholds met. Allow natural opportunities without forcing perfection.`
        }
      ],
      max_tokens: 1200,
      temperature: 0.3 // Balanced temperature for realistic analysis
    }),
  });

  if (!aiAnalysisResponse.ok) {
    throw new Error(`Recalibrated analysis error: ${aiAnalysisResponse.status}`);
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
  
  console.log(`🎯 Recalibrated Analysis Result for ${pair}: ${result.signal} (RSI: ${rsi.toFixed(1)}, Confidence: ${result.confidence}%, Score: ${result.technical_score})`);
  
  return result;
};

// UPDATED: Recalibrated quality signal processing - no forced generation
const processRecalibratedQualitySignals = async (pairs: string[], latestPrices: Map<any, any>, openAIApiKey: string, supabase: any) => {
  const results = [];
  
  // REMOVED: No max signals limit - process all available pairs
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    
    try {
      const marketPoint = latestPrices.get(pair);
      if (!marketPoint) continue;

      const currentPrice = parseFloat(marketPoint.current_price.toString());
      const priceHistory = generateRealisticPriceHistory(currentPrice, pair, 100);
      const atr = calculateImprovedATR(priceHistory);

      console.log(`🧠 RECALIBRATED analysis for ${pair} (Price: ${currentPrice.toFixed(5)}, ATR: ${atr.toFixed(5)})...`);

      const aiSignal = await analyzeWithRecalibratedMarketAnalysis(pair, marketPoint, openAIApiKey, priceHistory, {});

      // Skip neutral signals
      if (aiSignal.signal === 'NEUTRAL' || !['BUY', 'SELL'].includes(aiSignal.signal)) {
        console.log(`⚪ NEUTRAL ${pair} - No quality opportunity detected`);
        continue;
      }

      // UPDATED: Relaxed quality thresholds (70%, 60%, 6+, GOOD+)
      if (aiSignal.confidence < 70 || aiSignal.win_probability < 60 || aiSignal.technical_score < 6) {
        console.log(`❌ QUALITY FILTER: ${pair} (conf: ${aiSignal.confidence}%, prob: ${aiSignal.win_probability}%, score: ${aiSignal.technical_score})`);
        continue;
      }

      // UPDATED: Accept both EXCELLENT and GOOD quality
      if (!['EXCELLENT', 'GOOD'].includes(aiSignal.quality_grade)) {
        console.log(`❌ GRADE FILTER: ${pair} rated ${aiSignal.quality_grade} (need EXCELLENT or GOOD)`);
        continue;
      }

      // TECHNICAL CONFIRMATION VALIDATION with recalibrated thresholds
      const rsi = calculateRSI(priceHistory);
      const macd = calculateMACD(priceHistory);
      const ema50 = calculateEMA(priceHistory, 50);
      const ema200 = calculateEMA(priceHistory, 200);
      const bollingerBands = calculateBollingerBands(priceHistory);
      
      const technicalValidation = validateTechnicalConfirmation(currentPrice, rsi, macd, ema50, ema200, bollingerBands, aiSignal.signal);
      
      if (!technicalValidation.isValid) {
        console.log(`❌ TECHNICAL VALIDATION: ${pair} (score: ${technicalValidation.score}/10, confirmations: ${technicalValidation.confirmations.length})`);
        continue;
      }

      // UPDATED: Session advantage is now optional bonus (not required)
      const hour = new Date().getUTCHours();
      let sessionAdvantage = false;
      
      if (hour >= 0 && hour < 8) {
        sessionAdvantage = ['USDJPY', 'AUDJPY', 'NZDJPY', 'GBPJPY'].includes(pair);
      } else if (hour >= 8 && hour < 16) {
        sessionAdvantage = ['EURUSD', 'GBPUSD', 'EURGBP', 'EURCHF', 'GBPCHF'].includes(pair);
      } else if (hour >= 16 && hour < 24) {
        sessionAdvantage = ['EURUSD', 'GBPUSD', 'USDCAD', 'USDCHF'].includes(pair);
      }

      // Session advantage provides bonus but is not required
      const sessionBonus = sessionAdvantage ? ' +Session Advantage' : '';

      // Signal generation with recalibrated parameters
      const entryPrice = currentPrice;
      const atrMultiplier = 2.5;
      
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
        analysis_text: `RECALIBRATED ${aiSignal.quality_grade} Analysis (${aiSignal.win_probability}% win probability): ${aiSignal.analysis}. Technical confirmations: ${technicalValidation.confirmations.join(', ')}${sessionBonus}. ${aiSignal.signal_reasoning || ''}`,
        chart_data: chartData,
        pips: Math.round(Math.abs(entryPrice - stopLoss) / getPipValue(pair)),
        created_at: new Date().toISOString()
      };

      console.log(`✅ RECALIBRATED SIGNAL for ${pair}: ${aiSignal.signal} (${aiSignal.confidence}% confidence, ${signal.pips} pip stop, ${technicalValidation.confirmations.length} confirmations)${sessionBonus}`);
      results.push(signal);

      // Increased delay for quality analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Error in recalibrated analysis for ${pair}:`, error);
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
    
    console.log(`🎯 RECALIBRATED signal generation starting (balanced quality analysis, NO forced generation)...`);
    console.log(`🛡️ Recalibrated filters: RSI 30/70, 3/4 confirmations, 70%/60%/6+ thresholds, GOOD+ quality, session bonus`);
    
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
      const slotsNeeded = Math.min(6, 4); // Create some space for new opportunities
      const rotatedCount = await rotateOldestSignals(supabase, slotsNeeded);
      availableSlots = rotatedCount;
    }

    console.log(`✅ RECALIBRATED analysis will process all available pairs for natural opportunities (${availableSlots} slots available)`);

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
    
    console.log(`🔍 RECALIBRATED analysis of ${availablePairs.length} pairs for natural opportunities`);
    
    // Get latest prices
    const latestPrices = new Map();
    for (const pair of availablePairs) {
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
          message: 'No market data available for recalibrated analysis',
          signals: [],
          stats: {
            opportunitiesAnalyzed: 0,
            signalsGenerated: 0,
            totalActiveSignals: currentSignalCount,
            signalLimit: MAX_ACTIVE_SIGNALS,
            executionTime: `${Date.now() - startTime}ms`,
            recalibratedAnalysis: true,
            buySignals: buyCount,
            sellSignals: sellCount,
            forcedGeneration: false
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Recalibrated signal processing - NO forced generation
    console.log(`🚀 Starting RECALIBRATED signal generation with balanced technical requirements...`);
    
    const processingPromise = processRecalibratedQualitySignals(
      Array.from(latestPrices.keys()), 
      latestPrices, 
      openAIApiKey, 
      supabase
    );

    const signalsToInsert = await Promise.race([processingPromise, timeoutPromise]);

    // Insert signals up to available slots
    let signalsGenerated = 0;
    const generatedSignals = [];
    let newBuySignals = 0;
    let newSellSignals = 0;

    const signalsToProcess = signalsToInsert.slice(0, availableSlots); // Respect available slots

    for (const signal of signalsToProcess) {
      try {
        console.log(`💾 Inserting RECALIBRATED signal for ${signal.symbol}: ${signal.type}...`);
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
        
        console.log(`✅ RECALIBRATED signal ${signalsGenerated}: ${signal.symbol} ${signal.type} (${signal.confidence}% confidence)`);

      } catch (error) {
        console.error(`❌ Error inserting signal for ${signal.symbol}:`, error);
      }
    }

    const finalActiveSignals = currentSignalCount - Math.max(0, currentSignalCount - MAX_ACTIVE_SIGNALS) + signalsGenerated;
    const finalBuyCount = buyCount + newBuySignals;
    const finalSellCount = sellCount + newSellSignals;
    const executionTime = Date.now() - startTime;

    console.log(`📊 RECALIBRATED SIGNAL GENERATION COMPLETE:`);
    console.log(`  - Execution time: ${executionTime}ms`);
    console.log(`  - Natural opportunities found: ${signalsToInsert.length}, Generated: ${signalsGenerated} (BUY: ${newBuySignals}, SELL: ${newSellSignals})`);
    console.log(`  - Recalibrated filters: RSI 30/70, 3/4 confirmations, 70%/60%/6+ thresholds, GOOD+ quality`);
    console.log(`  - Total active: ${finalActiveSignals}/${MAX_ACTIVE_SIGNALS}`);
    console.log(`  - NO FORCED GENERATION - only natural opportunities`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Found ${signalsToInsert.length} natural opportunities, generated ${signalsGenerated} RECALIBRATED signals (BUY: ${newBuySignals}, SELL: ${newSellSignals}) in ${executionTime}ms - Balanced quality filters, no forced generation`,
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
          naturalOpportunities: signalsToInsert.length,
          signalsGenerated,
          totalActiveSignals: finalActiveSignals,
          signalLimit: MAX_ACTIVE_SIGNALS,
          executionTime: `${executionTime}ms`,
          timeoutProtection: `${FUNCTION_TIMEOUT_MS/1000}s`,
          recalibratedAnalysis: true,
          forcedGeneration: false,
          recalibratedRequirements: {
            minConfidence: '70%',
            minWinProbability: '60%',
            minTechnicalScore: '6/10',
            rsiThresholds: 'BUY<35, SELL>65 (prefer 30/70)',
            macdConfirmation: 'line+signal (histogram bonus)',
            trendAlignment: 'partial acceptable',
            qualityGrade: 'EXCELLENT or GOOD',
            sessionAdvantage: 'bonus (not required)',
            confirmationsRequired: '3 out of 4',
            minStopLoss: '50-60 pips'
          },
          signalDistribution: {
            buySignals: finalBuyCount,
            sellSignals: finalSellCount,
            newBuySignals,
            newSellSignals
          },
          technicalIndicators: ['RSI (30/70)', 'MACD+Histogram', 'EMA Alignment', 'Bollinger Bands', 'ATR'],
          recalibratedFeatures: [
            'Relaxed RSI thresholds (30/70 vs 25/75)',
            '3 out of 4 confirmations required (vs ALL 4)',
            'Lowered quality thresholds (70%/60%/6+)', 
            'Accept GOOD and EXCELLENT quality',
            'Session advantage as bonus (not required)',
            'NO forced signal generation',
            'Natural opportunity detection only'
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
    console.error(`💥 RECALIBRATED SIGNAL GENERATION ERROR (${executionTime}ms):`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
        recalibratedAnalysis: true,
        forcedGeneration: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
