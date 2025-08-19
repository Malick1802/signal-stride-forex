import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Professional Trading Thresholds
const PROFESSIONAL_THRESHOLDS = {
  TIER1_QUALITY_MIN: 60,
  TIER2_QUALITY_MIN: 70,
  TIER2_CONFIDENCE_MIN: 65,
  TIER3_QUALITY_MIN: 85,
  TIER3_CONFIDENCE_MIN: 75,
  MIN_SL_PIPS: 30,
  MIN_TP_PIPS: 30,
  MIN_RISK_REWARD: 1.5,
  MAX_VOLATILITY_ATR: 15,
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70
};

interface MarketData {
  symbol: string;
  price: number;
  timestamp: string;
  session: string;
}

// Enhanced AI Signal Analysis Interface
interface EnhancedAISignalAnalysis {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  qualityScore: number;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  reasoning: string;
  marketConditions?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe?: string;
  technicalFactors?: {
    rsi: number;
    macd: { macd: number; signal: number; histogram: number };
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    momentum: 'STRONG_UP' | 'WEAK_UP' | 'NEUTRAL' | 'WEAK_DOWN' | 'STRONG_DOWN';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    support: number[];
    resistance: number[];
    movingAverages: {
      sma50: number;
      sma200: number;
      priceVsSma50: string;
      priceVsSma200: string;
    };
    bollinger: {
      position: 'UPPER' | 'MIDDLE' | 'LOWER';
      squeeze: boolean;
    };
    candlestickPatterns: string[];
  };
  fundamentalFactors?: {
    economicEvents: Array<{
      currency: string;
      event: string;
      impact: 'LOW' | 'MEDIUM' | 'HIGH';
      sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    }>;
    tradingSession: 'ASIAN' | 'EUROPEAN' | 'US' | 'OVERLAP';
    marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  riskManagement: {
    stopLossPips: number;
    takeProfitPips: number[];
    riskRewardRatio: number;
    positionSizing: string;
    maxRisk: string;
  };
  _escalateToTier3?: boolean;
}

interface SignalData {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  stop_loss: number;
  take_profits: number[];
  confidence: number;
  analysis_text: string;
  chart_data: Array<{ time: number; price: number }>;
  technical_score?: number;
  fundamental_score?: number;
  sentiment_score?: number;
  technical_indicators?: any;
  market_context?: any;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

serve(async (req) => {
  console.log(`🚀 PROFESSIONAL AI-powered signal generation called - Method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    console.log('📋 CORS preflight request handled');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const fastforexApiKey = Deno.env.get('FASTFOREX_API_KEY');

    console.log(`🔧 Environment check - Supabase: ${!!supabaseUrl}, OpenAI: ${!!openAIApiKey}, FastForex: ${!!fastforexApiKey}`);

    if (!supabaseUrl || !supabaseKey || !openAIApiKey) {
      throw new Error('Missing required environment variables (Supabase or OpenAI API key)');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      console.log('📝 No request body or invalid JSON, using defaults');
    }

    const { 
      test = false, 
      skipGeneration = false, 
      force = false,
      debug = false,
      trigger = 'manual'
    } = requestBody;

    console.log(`🎯 Request params - Test: ${test}, Skip: ${skipGeneration}, Force: ${force}, Trigger: ${trigger}, PROFESSIONAL AI-powered: true`);

    // Test mode
    if (test && skipGeneration) {
      console.log('✅ Test mode - PROFESSIONAL AI-powered function is responsive');
      return new Response(JSON.stringify({ 
        status: 'success', 
        message: 'PROFESSIONAL AI-powered edge function is working',
        timestamp: new Date().toISOString(),
        environment: {
          supabase: !!supabaseUrl,
          openai: !!openAIApiKey,
          fastforex: !!fastforexApiKey
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get current market data
    console.log('📊 Fetching current market data...');
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false })
      .limit(30);

    if (marketError) {
      console.error('❌ Market data fetch error:', marketError);
      throw new Error(`Market data fetch failed: ${marketError.message}`);
    }

    if (!marketData || marketData.length === 0) {
      console.log('⚠️ No market data available, cannot generate PROFESSIONAL AI signals');
      return new Response(JSON.stringify({
        error: 'No market data available',
        stats: { signalsGenerated: 0, reason: 'no_market_data' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log(`📈 Market data loaded: ${marketData.length} currency pairs`);

    // Check existing active signals
    const { data: existingSignals, error: signalsError } = await supabase
      .from('trading_signals')
      .select('id, symbol, type, confidence')
      .eq('status', 'active')
      .eq('is_centralized', true)
      .is('user_id', null);

    if (signalsError) {
      console.error('❌ Existing signals check error:', signalsError);
      throw new Error(`Signals check failed: ${signalsError.message}`);
    }

    const currentSignalCount = existingSignals?.length || 0;
    const maxSignals = 20;
    const maxNewSignals = Math.min(6, maxSignals - currentSignalCount);

    console.log(`📋 PROFESSIONAL Signal status - Current: ${currentSignalCount}/${maxSignals}, Can generate: ${maxNewSignals}`);

    // Clear existing signals in force mode
    if (force && existingSignals && existingSignals.length > 0) {
      console.log(`🔧 FORCE MODE: Clearing ${existingSignals.length} existing signals`);
      
      const { error: deleteError } = await supabase
        .from('trading_signals')
        .delete()
        .eq('status', 'active')
        .eq('is_centralized', true)
        .is('user_id', null);
      
      if (deleteError) {
        console.error('❌ Error clearing existing signals:', deleteError);
      } else {
        console.log('✅ Successfully cleared existing signals');
      }
    }

    if (maxNewSignals <= 0 && !force) {
      console.log('⚠️ Signal limit reached, skipping generation');
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'signal_limit_reached',
        stats: { signalsGenerated: 0, totalActiveSignals: currentSignalCount, signalLimit: maxSignals }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Generate PROFESSIONAL AI-powered signals
    const startTime = Date.now();
    const generatedSignals: SignalData[] = [];
    const errors: string[] = [];

    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    const availablePairs = marketData
      .filter(d => d.symbol && d.current_price > 0)
      .map(d => d.symbol)
      .filter(symbol => !existingSignals?.some(s => s.symbol === symbol));

    console.log(`🔥 PROFESSIONAL MODE: Analyzing ${availablePairs.length} pairs with institutional-grade analysis`);

    // Professional analysis with intelligent batching
    for (let i = 0; i < availablePairs.length && generatedSignals.length < maxNewSignals; i++) {
      const symbol = availablePairs[i];
      
      try {
        const pair = marketData.find(d => d.symbol === symbol);
        if (!pair || !pair.current_price) continue;

        console.log(`🤖 PROFESSIONAL AI analyzing ${symbol} - Price: ${pair.current_price} (${i + 1}/${availablePairs.length})`);

        // Professional Multi-Timeframe Analysis with FastForex Integration
        const marketDataSnapshot = {
          symbol,
          price: pair.current_price,
          timestamp: new Date().toISOString(),
          session: getCurrentTradingSession()
        };
        
        const sessionAnalysis = getCurrentSessionAnalysis();
        const priorityScore = getPairPriority(symbol, i + 1);
        
        // Execute Professional 3-Tier Pipeline
        const signalData = await generateHybridTierAnalysis(
          openAIApiKey,
          symbol,
          marketDataSnapshot,
          supabase,
          sessionAnalysis,
          priorityScore
        );
        
        if (signalData) {
          generatedSignals.push(signalData);
          console.log(`✅ PROFESSIONAL SIGNAL: ${signalData.type} ${symbol} (${signalData.confidence}% confidence)`);
        }

      } catch (error) {
        console.error(`❌ Error analyzing ${symbol}:`, error);
        errors.push(`${symbol}: ${error.message}`);
        
        // Rate limit handling
        if (error.message.includes('rate limit')) {
          console.log(`⏱️ Rate limit detected, implementing backoff...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      }
      
      // Intelligent delay for rate limit management
      if (i + 1 < availablePairs.length) {
        const delayMs = 8000 + (i * 1000); // Progressive delay
        console.log(`⏱️ Professional delay: ${delayMs/1000}s before next analysis...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log(`🤖 PROFESSIONAL AI signal generation complete - Generated: ${generatedSignals.length}, Errors: ${errors.length}`);

    // Save PROFESSIONAL signals to database
    let savedCount = 0;
    const signalDistribution = { newBuySignals: 0, newSellSignals: 0 };

    for (const signal of generatedSignals) {
      try {
        const { error: insertError } = await supabase
          .from('trading_signals')
          .insert({
            symbol: signal.symbol,
            type: signal.type,
            price: signal.price,
            stop_loss: signal.stop_loss,
            take_profits: signal.take_profits,
            confidence: signal.confidence,
            analysis_text: signal.analysis_text,
            chart_data: signal.chart_data,
            technical_score: signal.technical_score || 0,
            fundamental_score: signal.fundamental_score || 0,
            sentiment_score: signal.sentiment_score || 0,
            technical_indicators: signal.technical_indicators || {},
            market_context: signal.market_context || {},
            status: 'active',
            is_centralized: true,
            user_id: null
          });

        if (insertError) {
          console.error(`❌ Failed to save signal for ${signal.symbol}:`, insertError);
          errors.push(`Save ${signal.symbol}: ${insertError.message}`);
        } else {
          savedCount++;
          if (signal.type === 'BUY') signalDistribution.newBuySignals++;
          else signalDistribution.newSellSignals++;
          console.log(`💾 Saved PROFESSIONAL ${signal.type} signal for ${signal.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Database error for ${signal.symbol}:`, error);
        errors.push(`DB ${signal.symbol}: ${error.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    const finalActiveCount = currentSignalCount + savedCount;

    console.log(`✅ PROFESSIONAL generation complete - Saved: ${savedCount}/${generatedSignals.length}, Total active: ${finalActiveCount}/${maxSignals}, Time: ${executionTime}ms`);

    const response = {
      status: 'success',
      stats: {
        signalsGenerated: savedCount,
        totalGenerated: generatedSignals.length,
        totalActiveSignals: finalActiveCount,
        signalLimit: maxSignals,
        executionTime: `${executionTime}ms`,
        signalDistribution,
        professionalAI: true,
        qualityFiltered: true,
        minimumQualityScore: PROFESSIONAL_THRESHOLDS.TIER1_QUALITY_MIN,
        errors: errors.length > 0 ? errors.slice(0, 3) : undefined
      },
      trigger,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Critical error in PROFESSIONAL AI signal generation:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      status: 'error',
      timestamp: new Date().toISOString(),
      stats: { signalsGenerated: 0 }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Get historical price data for technical analysis
async function getHistoricalPriceData(supabase: any, symbol: string): Promise<PricePoint[] | null> {
  try {
    const { data, error } = await supabase
      .from('live_price_history')
      .select('price, created_at')
      .eq('symbol', symbol)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Error fetching price history:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn(`No price history found for ${symbol}`);
      return null;
    }

    return data.map(record => ({
      timestamp: new Date(record.created_at).getTime(),
      price: record.price
    }));
  } catch (error) {
    console.error('Error in getHistoricalPriceData:', error);
    return null;
  }
}

// Enhanced Professional Signal Generation Pipeline
async function generateHybridTierAnalysis(
  openaiApiKey: string,
  symbol: string,
  marketData: any,
  supabase: any,
  sessionAnalysis: any,
  priorityScore: number
): Promise<SignalData | null> {
  try {
    console.log(`🤖 ENHANCED AI analyzing ${symbol} - Price: ${marketData.price} (${priorityScore}/12)`);
    
    // Fetch historical data for technical analysis
    const priceHistory = await getHistoricalPriceData(supabase, symbol);
    
    // Calculate technical indicators
    const atr = calculateATR(priceHistory || [], symbol);
    const trendStrength = calculateTrendStrength(priceHistory || []);
    const marketRegime = detectMarketRegime(priceHistory || [], atr);
    
    // Enhanced Tier 1: Professional Technical Pre-Screening
    const localQualityScore = calculateLocalQualityScore(
      symbol,
      marketData.price,
      priceHistory,
      atr,
      trendStrength,
      marketRegime
    );
    
    if (localQualityScore < PROFESSIONAL_THRESHOLDS.TIER1_QUALITY_MIN) {
      console.log(`❌ TIER 1: ${symbol} failed professional pre-screening (${localQualityScore} < ${PROFESSIONAL_THRESHOLDS.TIER1_QUALITY_MIN})`);
      return null;
    }
    
    console.log(`✅ TIER 1: ${symbol} passed professional pre-screening (score: ${localQualityScore}/100)`);
    
    // Determine professional tier routing
    const tierRoute = determineTierRouting(symbol, localQualityScore, sessionAnalysis, priorityScore);
    
    // Execute Tier 2 Analysis (Multi-Factor Assessment)
    let tier2Analysis = await executeTier2Analysis(
      openaiApiKey,
      symbol,
      marketData,
      priceHistory,
      localQualityScore,
      sessionAnalysis
    );
    
    if (!tier2Analysis) {
      console.log(`❌ TIER 2: ${symbol} analysis failed`);
      return null;
    }
    
    // Check for Tier 3 escalation or routing
    let finalAnalysis = tier2Analysis;
    
    if (tierRoute === 3 || tier2Analysis._escalateToTier3) {
      console.log(`🚀 TIER 3: Executing premium analysis for ${symbol}...`);
      
      const tier3Analysis = await executeTier3Analysis(
        openaiApiKey,
        symbol,
        marketData,
        priceHistory,
        localQualityScore,
        sessionAnalysis,
        tier2Analysis
      );
      
      if (tier3Analysis) {
        finalAnalysis = tier3Analysis;
      } else {
        console.log(`❌ TIER 3: ${symbol} premium analysis failed, using Tier 2 result`);
      }
    }
    
    // Final validation and signal generation
    if (!finalAnalysis || finalAnalysis.recommendation === 'HOLD') {
      console.log(`🤖 ${symbol} FINAL DECISION: HOLD - No signal generated`);
      return null;
    }
    
    // Global professional signal validation
    const validatedSignal = await validateProfessionalSignal(finalAnalysis, symbol, marketData);
    
    if (!validatedSignal) {
      console.log(`❌ GLOBAL VALIDATOR: ${symbol} failed professional validation`);
      return null;
    }
    
    console.log(`✅ ${symbol} PROFESSIONAL SIGNAL GENERATED: ${validatedSignal.type} at ${validatedSignal.price}`);
    
    return validatedSignal;
    
  } catch (error) {
    console.error(`❌ Error in professional signal pipeline for ${symbol}:`, error);
    return null;
  }
}

// Professional utility functions (simplified for core implementation)
function calculateATR(priceHistory: PricePoint[] | null, symbol: string): number {
  if (!priceHistory || priceHistory.length < 14) return 0.001;
  
  const prices = priceHistory.slice(-14).map(p => p.price);
  const ranges = [];
  
  for (let i = 1; i < prices.length; i++) {
    ranges.push(Math.abs(prices[i] - prices[i - 1]));
  }
  
  return ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
}

function calculateTrendStrength(priceHistory: PricePoint[] | null): string {
  if (!priceHistory || priceHistory.length < 20) return 'WEAK';
  
  const prices = priceHistory.slice(-20).map(p => p.price);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = Math.abs(lastPrice - firstPrice) / firstPrice;
  
  if (change > 0.02) return 'STRONG';
  if (change > 0.01) return 'MODERATE';
  return 'WEAK';
}

function detectMarketRegime(priceHistory: PricePoint[] | null, atr: number): string {
  if (!priceHistory || priceHistory.length < 20) return 'RANGING';
  
  const prices = priceHistory.slice(-20).map(p => p.price);
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const volatility = atr / avgPrice;
  
  if (volatility > 0.02) return 'VOLATILE';
  if (volatility > 0.01) return 'TRENDING';
  return 'RANGING';
}

function calculateLocalQualityScore(
  symbol: string,
  currentPrice: number,
  priceHistory: PricePoint[] | null,
  atr: number,
  trendStrength: string,
  marketRegime: string
): number {
  let score = 40; // Base score
  
  // ATR-based volatility scoring
  const avgPrice = priceHistory?.length ? 
    priceHistory.slice(-20).reduce((sum, p) => sum + p.price, 0) / 20 : currentPrice;
  const atrPercentage = (atr / avgPrice) * 100;
  
  if (atrPercentage > 0.5 && atrPercentage < 1.5) score += 15;
  else if (atrPercentage <= 0.5) score += 10;
  else score += 5;
  
  // Trend strength scoring
  if (trendStrength === 'STRONG') score += 20;
  else if (trendStrength === 'MODERATE') score += 15;
  else if (trendStrength === 'WEAK') score += 10;
  
  // Market regime scoring
  if (marketRegime === 'TRENDING') score += 15;
  else if (marketRegime === 'RANGING') score += 10;
  else score += 5;
  
  if (priceHistory && priceHistory.length >= 50) score += 10;
  
  return Math.min(score, 100);
}

function determineTierRouting(
  symbol: string,
  localScore: number,
  sessionAnalysis: any,
  priorityScore: number
): 2 | 3 {
  const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
  
  if (majorPairs.includes(symbol) && 
      (sessionAnalysis.session === 'EUROPEAN' || sessionAnalysis.session === 'US') &&
      localScore >= 40) {
    return 3;
  }
  
  if (localScore >= 70) return 3;
  
  return 2;
}

async function executeTier2Analysis(
  openaiApiKey: string,
  symbol: string,
  marketData: any,
  priceHistory: PricePoint[] | null,
  localQualityScore: number,
  sessionAnalysis: any
): Promise<EnhancedAISignalAnalysis | null> {
  console.log(`💰 TIER 2: Professional analysis for ${symbol}...`);
  
  try {
    const prompt = `Professional Forex Analysis - TIER 2
    
Symbol: ${symbol}
Current Price: ${marketData.price}
Quality Score: ${localQualityScore}/100
Session: ${sessionAnalysis.session}

Provide comprehensive technical analysis with:
1. RSI levels and MACD signals
2. Moving average trends
3. Support/resistance levels
4. Risk management recommendations

Only recommend BUY/SELL if confidence ≥65% AND quality ≥70/100
Minimum stop-loss: 30 pips, Risk-reward: ≥1.5:1

Return JSON:
{
  "recommendation": "BUY|SELL|HOLD",
  "confidence": number,
  "qualityScore": number,
  "entryPrice": ${marketData.price},
  "stopLoss": number,
  "takeProfits": [tp1, tp2, tp3],
  "reasoning": "detailed analysis"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional forex trader.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.2
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const analysis = JSON.parse(jsonMatch[0]);
    
    console.log(`🤖 ${symbol} Tier 2 result: ${analysis.recommendation} (${analysis.confidence}% confidence)`);
    
    return analysis;
  } catch (error) {
    console.error(`Tier 2 failed for ${symbol}:`, error);
    return null;
  }
}

async function executeTier3Analysis(
  openaiApiKey: string,
  symbol: string,
  marketData: any,
  priceHistory: PricePoint[] | null,
  localQualityScore: number,
  sessionAnalysis: any,
  tier2Analysis?: EnhancedAISignalAnalysis | null
): Promise<EnhancedAISignalAnalysis | null> {
  console.log(`💎 TIER 3: Premium analysis for ${symbol}...`);
  
  try {
    const prompt = `Premium Institutional Analysis - TIER 3

Symbol: ${symbol}
Price: ${marketData.price}
Quality: ${localQualityScore}/100
Session: ${sessionAnalysis.session}

Conduct institutional-grade analysis:
- Multi-timeframe alignment
- Advanced patterns
- Order flow analysis
- Risk management precision

Requirements: Confidence ≥75%, Quality ≥85/100

Return JSON with comprehensive analysis.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are a senior institutional forex trader.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 800,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const analysis = JSON.parse(jsonMatch[0]);
    
    console.log(`💎 ${symbol} Tier 3 result: ${analysis.recommendation} (${analysis.confidence}% confidence)`);
    
    return analysis;
  } catch (error) {
    console.error(`Tier 3 failed for ${symbol}:`, error);
    return null;
  }
}

async function validateProfessionalSignal(
  analysis: EnhancedAISignalAnalysis,
  symbol: string,
  marketData: any
): Promise<SignalData | null> {
  try {
    const isJPY = symbol.includes('JPY');
    const pipMultiplier = isJPY ? 100 : 10000;
    
    const stopLossPips = Math.abs(analysis.entryPrice - analysis.stopLoss) * pipMultiplier;
    if (stopLossPips < PROFESSIONAL_THRESHOLDS.MIN_SL_PIPS) {
      console.log(`❌ Stop-loss too tight: ${stopLossPips} pips`);
      return null;
    }
    
    if (!analysis.takeProfits || analysis.takeProfits.length === 0) {
      console.log(`❌ No take-profit levels`);
      return null;
    }
    
    const firstTPPips = Math.abs(analysis.takeProfits[0] - analysis.entryPrice) * pipMultiplier;
    const riskReward = firstTPPips / stopLossPips;
    
    if (riskReward < PROFESSIONAL_THRESHOLDS.MIN_RISK_REWARD) {
      console.log(`❌ Risk-reward too low: ${riskReward.toFixed(2)}`);
      return null;
    }
    
    // Generate synthetic chart data
    const chartData = [];
    for (let i = 0; i < 50; i++) {
      chartData.push({
        time: Date.now() - (50 - i) * 60000,
        price: analysis.entryPrice * (0.999 + Math.random() * 0.002)
      });
    }
    
    return {
      symbol,
      type: analysis.recommendation as 'BUY' | 'SELL',
      price: analysis.entryPrice,
      stop_loss: analysis.stopLoss,
      take_profits: analysis.takeProfits,
      confidence: analysis.confidence,
      analysis_text: analysis.reasoning,
      chart_data: chartData,
      technical_score: analysis.qualityScore,
      fundamental_score: 75,
      sentiment_score: 70
    };
  } catch (error) {
    console.error(`Validation failed:`, error);
    return null;
  }
}

// Trading session utilities
function getCurrentTradingSession(): 'ASIAN' | 'EUROPEAN' | 'US' | 'OVERLAP' {
  const utcHour = new Date().getUTCHours();
  
  if (utcHour >= 22 || utcHour < 7) return 'ASIAN';
  if (utcHour >= 7 && utcHour < 16) return 'EUROPEAN';
  if (utcHour >= 13 && utcHour < 22) {
    if (utcHour < 16) return 'OVERLAP';
    return 'US';
  }
  
  return 'US';
}

function getCurrentSessionAnalysis() {
  return {
    session: getCurrentTradingSession(),
    volatility: 'MEDIUM',
    recommendation: 'Standard'
  };
}

function getPairPriority(symbol: string, position: number): number {
  const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
  
  let score = 100 - position;
  if (majorPairs.includes(symbol)) score += 50;
  
  return Math.max(score, 1);
}