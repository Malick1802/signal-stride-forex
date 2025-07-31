
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-github-run-id, x-optimized-mode',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MarketData {
  symbol: string;
  price: number;
  timestamp: string;
  session: string;
}

interface EnhancedAISignalAnalysis {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  reasoning: string;
  technicalFactors: string[];
  riskAssessment: string;
  marketRegime: string;
  sessionAnalysis: string;
  qualityScore: number;
}

interface SignalData {
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  pips: number;
  stopLoss: number;
  takeProfits: number[];
  confidence: number;
  analysisText: string;
  technicalIndicators: any;
  chartData: Array<{ time: number; price: number }>;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

serve(async (req) => {
  console.log(`🚀 ENHANCED AI-powered signal generation called - Method: ${req.method}`);
  
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

    console.log(`🔧 Environment check - Supabase: ${!!supabaseUrl}, OpenAI: ${!!openAIApiKey}`);

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
      trigger = 'manual',
      run_id,
      attempt = 1,
      optimized = false
    } = requestBody;

    console.log(`🎯 Request params - Test: ${test}, Skip: ${skipGeneration}, Force: ${force}, Trigger: ${trigger}, ENHANCED AI-powered: true`);

    // Test mode
    if (test && skipGeneration) {
      console.log('✅ Test mode - ENHANCED AI-powered function is responsive');
      return new Response(JSON.stringify({ 
        status: 'success', 
        message: 'ENHANCED AI-powered edge function is working',
        timestamp: new Date().toISOString(),
        environment: {
          supabase: !!supabaseUrl,
          openai: !!openAIApiKey
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
      console.log('⚠️ No market data available, cannot generate ENHANCED AI signals');
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
    const maxSignals = 15; // Reduced from 20 to 15
    const maxNewSignals = optimized ? Math.min(5, maxSignals - currentSignalCount) : Math.min(8, maxSignals - currentSignalCount); // Increased to 5-8 for more analysis

    console.log(`📋 ENHANCED AI Signal status - Current: ${currentSignalCount}/${maxSignals}, Can generate: ${maxNewSignals}, ENHANCED AI-powered mode`);

    if (maxNewSignals <= 0 && !force) {
      console.log('⚠️ Signal limit reached, skipping ENHANCED AI generation');
      return new Response(JSON.stringify({
        status: 'skipped',
        reason: 'signal_limit_reached',
        stats: {
          signalsGenerated: 0,
          totalActiveSignals: currentSignalCount,
          signalLimit: maxSignals,
          maxNewSignalsPerRun: optimized ? 4 : 6
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Generate ENHANCED AI-powered signals
    const startTime = Date.now();
    const generatedSignals: SignalData[] = [];
    const errors: string[] = [];

    // Major currency pairs (prioritized for ENHANCED AI analysis)
    const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
    const availablePairs = marketData
      .filter(d => d.symbol && d.current_price > 0)
      .map(d => d.symbol)
      .filter(symbol => !existingSignals?.some(s => s.symbol === symbol));

    // Prioritize major pairs for ENHANCED AI analysis - analyze ALL available pairs
    const prioritizedPairs = [
      ...availablePairs.filter(symbol => majorPairs.includes(symbol)),
      ...availablePairs.filter(symbol => !majorPairs.includes(symbol))
    ]; // Removed slice limit - now analyzes all available pairs

    console.log(`🤖 ENHANCED AI analyzing ${prioritizedPairs.length} currency pairs for HIGH-QUALITY signal generation`);

    // Process pairs for ENHANCED AI analysis with stricter filtering
    const batchSize = optimized ? 4 : 6; // Increased batch size for better throughput
    for (let i = 0; i < prioritizedPairs.length && generatedSignals.length < maxNewSignals; i += batchSize) {
      const batch = prioritizedPairs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (symbol) => {
        if (generatedSignals.length >= maxNewSignals) return;

        try {
          const pair = marketData.find(d => d.symbol === symbol);
          if (!pair || !pair.current_price) return;

          console.log(`🤖 ENHANCED AI analyzing ${symbol} - Price: ${pair.current_price}`);

          // Get historical price data with extended history
          const historicalData = await getHistoricalPriceData(supabase, symbol);
          if (!historicalData || historicalData.length < 100) { // Increased minimum data requirement
            console.log(`⚠️ Insufficient historical data for ENHANCED AI analysis ${symbol}: ${historicalData?.length || 0} points`);
            return;
          }

          // Generate ENHANCED AI-powered signal analysis with market context
          const aiAnalysis = await generateEnhancedAISignalAnalysis(openAIApiKey, pair, historicalData);
          
          if (!aiAnalysis || aiAnalysis.recommendation === 'HOLD' || aiAnalysis.qualityScore < 55) {
            console.log(`🤖 ${symbol} ENHANCED AI recommendation: ${aiAnalysis?.recommendation || 'HOLD'} - Quality score: ${aiAnalysis?.qualityScore || 0} - No signal generated`);
            return;
          }

          console.log(`🤖 ${symbol} ENHANCED AI recommendation: ${aiAnalysis.recommendation} (${aiAnalysis.confidence}% confidence, Quality: ${aiAnalysis.qualityScore})`);

          const signal = await convertEnhancedAIAnalysisToSignal(pair, aiAnalysis, historicalData);

          // Quality filter - accept good quality signals
          if (signal && signal.confidence >= 65 && aiAnalysis.qualityScore >= 55) {
            generatedSignals.push(signal);
            console.log(`✅ Generated AI ${signal.type} signal for ${symbol} (${signal.confidence}% confidence, Quality: ${aiAnalysis.qualityScore})`);
          } else {
            console.log(`❌ ${symbol} AI signal generation failed - Quality standards not met (Confidence: ${signal?.confidence || 0}, Quality: ${aiAnalysis.qualityScore})`);
          }
        } catch (error) {
          console.error(`❌ Error in ENHANCED AI analysis for ${symbol}:`, error);
          errors.push(`${symbol}: ${error.message}`);
        }
      }));

      // Add delay between ENHANCED AI batches to respect rate limits
      if (i + batchSize < prioritizedPairs.length) {
        await new Promise(resolve => setTimeout(resolve, optimized ? 2000 : 3000)); // Increased delay from 1000/1500 to 2000/3000
      }
    }

    console.log(`🤖 ENHANCED AI signal generation complete - Generated: ${generatedSignals.length}, Errors: ${errors.length}`);

    // Save ENHANCED AI-generated signals to database
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
            pips: signal.pips,
            stop_loss: signal.stopLoss,
            take_profits: signal.takeProfits,
            confidence: signal.confidence,
            analysis_text: signal.analysisText,
            chart_data: signal.chartData,
            status: 'active',
            is_centralized: true,
            user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`❌ Failed to save ENHANCED AI signal for ${signal.symbol}:`, insertError);
          errors.push(`Save ${signal.symbol}: ${insertError.message}`);
        } else {
          savedCount++;
          if (signal.type === 'BUY') signalDistribution.newBuySignals++;
          else signalDistribution.newSellSignals++;
          console.log(`💾 Saved HIGH-QUALITY AI ${signal.type} signal for ${signal.symbol}`);
        }
      } catch (error) {
        console.error(`❌ Database error for ${signal.symbol}:`, error);
        errors.push(`DB ${signal.symbol}: ${error.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    const finalActiveCount = currentSignalCount + savedCount;

    console.log(`✅ ENHANCED AI generation complete - Saved: ${savedCount}/${generatedSignals.length}, Total active: ${finalActiveCount}/${maxSignals}, Time: ${executionTime}ms`);

    const response = {
      status: 'success',
      stats: {
        signalsGenerated: savedCount,
        totalGenerated: generatedSignals.length,
        totalActiveSignals: finalActiveCount,
        signalLimit: maxSignals,
        executionTime: `${executionTime}ms`,
        signalDistribution,
        maxNewSignalsPerRun: optimized ? 4 : 6,
        enhancedAI: true,
        qualityFiltered: true,
        minimumQualityScore: 55,
        concurrentLimit: batchSize,
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
    console.error('❌ Critical error in ENHANCED AI signal generation:', error);
    
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

// Get historical price data from database with extended history
async function getHistoricalPriceData(supabase: any, symbol: string): Promise<PricePoint[] | null> {
  try {
    const { data, error } = await supabase
      .from('live_price_history')
      .select('timestamp, price')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: true })
      .limit(500); // Increased data points for better analysis

    if (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return null;
    }

    if (!data || data.length < 100) {
      console.log(`Insufficient historical data for ${symbol}: ${data?.length || 0} points`);
      return null;
    }

    return data.map((point: any) => ({
      timestamp: new Date(point.timestamp).getTime(),
      price: parseFloat(point.price)
    }));
  } catch (error) {
    console.error(`Error in getHistoricalPriceData for ${symbol}:`, error);
    return null;
  }
}

// Generate ENHANCED AI-powered signal analysis with comprehensive market context
async function generateEnhancedAISignalAnalysis(
  openAIApiKey: string,
  pair: any,
  historicalData: PricePoint[]
): Promise<EnhancedAISignalAnalysis | null> {
  try {
    const symbol = pair.symbol;
    const currentPrice = pair.current_price;
    
    // Enhanced market data context for AI
    const recentPrices = historicalData.slice(-100);
    const extendedPrices = historicalData.slice(-200);
    
    // Technical analysis calculations
    const highPrice = Math.max(...recentPrices.map(p => p.price));
    const lowPrice = Math.min(...recentPrices.map(p => p.price));
    const priceRange = highPrice - lowPrice;
    const currentPositionInRange = ((currentPrice - lowPrice) / priceRange * 100).toFixed(1);
    
    // Volatility analysis
    const atr = calculateATR(recentPrices);
    const volatilityRatio = atr / currentPrice;
    
    // Trend analysis
    const trendStrength = calculateTrendStrength(recentPrices);
    const marketRegime = detectMarketRegime(recentPrices, atr);
    
    // Session analysis
    const sessionAnalysis = getCurrentSessionAnalysis();
    
    // Economic calendar context (simplified)
    const economicContext = getEconomicContext(symbol);
    
    // Helper functions for pip calculations
    const isJPYPair = (symbol: string): boolean => symbol.includes('JPY');
    const getPipValue = (symbol: string): number => isJPYPair(symbol) ? 0.01 : 0.0001;
    const minStopLossPips = 30; // Adjusted to more realistic value
    const minTakeProfitPips = 25; // Adjusted to more realistic value
    
    // CONSERVATIVE: Session-based filtering
    const currentSession = getCurrentSessionAnalysis();
    if (currentSession.recommendation === 'avoid') {
      return null; // Skip signal generation during low activity periods
    }
    
    // Market regime filtering - more permissive
    const regime = detectMarketRegime(recentPrices, atr);
    if (regime.includes('Highly Volatile')) {
      return null; // Only skip signals in extremely volatile conditions
    }
    
    const enhancedPrompt = `You are a professional forex trading analyst with 15+ years of experience. Analyze the following COMPREHENSIVE market data for ${symbol} and provide a HIGH-QUALITY trading recommendation.

CURRENT MARKET DATA:
- Symbol: ${symbol}
- Current Price: ${currentPrice}
- Position in Range: ${currentPositionInRange}% (0% = recent low, 100% = recent high)
- Recent High: ${highPrice}
- Recent Low: ${lowPrice}
- Price Range: ${priceRange.toFixed(5)}
- ATR (Volatility): ${atr.toFixed(5)}
- Volatility Ratio: ${(volatilityRatio * 100).toFixed(3)}%

MARKET CONTEXT:
- Market Regime: ${marketRegime}
- Trend Strength: ${trendStrength}
- Current Session: ${sessionAnalysis.session}
- Session Volatility: ${sessionAnalysis.volatility}
- Session Recommendation: ${sessionAnalysis.recommendation}
- Economic Context: ${economicContext}

PRICE MOMENTUM (last 20 periods):
${recentPrices.slice(-20).map((p, i) => `${i + 1}: ${p.price.toFixed(5)}`).join(', ')}

ENHANCED ANALYSIS REQUIREMENTS:
1. Market Regime Assessment: Is this a trending, ranging, or volatile market?
2. Multi-Timeframe Alignment: Are short and medium-term trends aligned?
3. Session Optimization: How does current session affect this pair?
4. Risk-Reward Analysis: Can we achieve minimum ${minStopLossPips} pip SL and ${minTakeProfitPips} pip TP with 1.5:1+ R:R?
5. Economic Impact: Any major economic events affecting this pair?
6. Technical Confluence: Multiple technical factors confirming the setup?

STRICT QUALITY REQUIREMENTS:
- Minimum Stop Loss: ${minStopLossPips} pips (${(minStopLossPips * getPipValue(symbol)).toFixed(5)} price units)
- Minimum Take Profit: ${minTakeProfitPips} pips (${(minTakeProfitPips * getPipValue(symbol)).toFixed(5)} price units)
- Minimum R:R Ratio: 1.5:1
- Confidence Threshold: 65%+
- Quality Score Threshold: 55/100
- Session Requirement: Acceptable during most sessions (avoid only extreme low activity)
- Market Regime: Acceptable in most conditions (avoid only highly volatile)
- Volatility: Must be within normal range (not extreme)

Only recommend BUY/SELL if ALL criteria are met:
✓ Clear technical setup with 3+ confirmations
✓ Reasonable market regime (avoid only highly volatile conditions)
✓ Acceptable trading session (avoid only extreme low activity periods)
✓ Proper risk-reward ratio (1.5:1 minimum)
✓ Strong trend alignment on multiple timeframes
✓ No conflicting economic events
✓ Quality score 55+
✓ Market volatility within acceptable range (not extreme)
✓ Correlation check passed with existing positions

Provide your analysis in this EXACT JSON format:
{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": [number between 65-95 for signals, lower for HOLD],
  "entryPrice": [current price],
  "stopLoss": [price level meeting minimum ${minStopLossPips} pip requirement],
  "takeProfits": [array of 5 price levels with 2.5:1, 3.5:1, 4.5:1, 5.5:1, 6.5:1 ratios],
  "reasoning": "[detailed explanation of the setup with specific technical factors]",
  "technicalFactors": ["factor1", "factor2", "factor3", "factor4+"],
  "riskAssessment": "[comprehensive risk evaluation including session, volatility, economic factors]",
  "marketRegime": "[trending_bullish/trending_bearish/ranging/volatile - with strength assessment]",
  "sessionAnalysis": "[how current session supports or opposes the trade]",
  "qualityScore": [number 0-100 based on setup quality, confluence, and market conditions]
}

CRITICAL: Only provide BUY/SELL if quality score >= 55 and confidence >= 65. Use HOLD for anything below these thresholds.`;

    console.log(`🤖 Sending ENHANCED AI analysis request for ${symbol}...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Updated to latest model
        messages: [
          {
            role: 'system',
            content: 'You are a professional forex analyst with 15+ years of experience. You only recommend trades with exceptional quality and confluence. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent analysis
        max_tokens: 1200 // Increased for detailed analysis
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0].message.content;
    
    console.log(`🤖 ENHANCED AI response for ${symbol}:`, aiContent.substring(0, 300) + '...');

    // Parse ENHANCED AI response
    try {
      const analysisMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!analysisMatch) {
        throw new Error('No valid JSON found in ENHANCED AI response');
      }
      
      const analysis: EnhancedAISignalAnalysis = JSON.parse(analysisMatch[0]);
      
      // Validate ENHANCED AI response
      if (!analysis.recommendation || !['BUY', 'SELL', 'HOLD'].includes(analysis.recommendation)) {
        throw new Error('Invalid recommendation from ENHANCED AI');
      }
      
      if (analysis.recommendation !== 'HOLD') {
        if (analysis.confidence < 65 || analysis.confidence > 95) {
          console.log(`🤖 ${symbol} AI confidence ${analysis.confidence}% below threshold - converting to HOLD`);
          return { ...analysis, recommendation: 'HOLD' as const, qualityScore: Math.min(analysis.qualityScore || 0, 60) };
        }
        
        if ((analysis.qualityScore || 0) < 55) {
          console.log(`🤖 ${symbol} AI quality score ${analysis.qualityScore || 0} below threshold - converting to HOLD`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
        
        // Validate enhanced pip requirements
        const stopLossPips = Math.abs(analysis.entryPrice - analysis.stopLoss) / getPipValue(symbol);
        const takeProfitPips = Math.abs(analysis.takeProfits[0] - analysis.entryPrice) / getPipValue(symbol);
        
        if (stopLossPips < minStopLossPips) {
          console.log(`🤖 ${symbol} ENHANCED AI stop loss only ${stopLossPips.toFixed(1)} pips - below ${minStopLossPips} pip minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
        
        if (takeProfitPips < minTakeProfitPips) {
          console.log(`🤖 ${symbol} ENHANCED AI take profit only ${takeProfitPips.toFixed(1)} pips - below ${minTakeProfitPips} pip minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
        
        // Validate R:R ratio
        const rrRatio = takeProfitPips / stopLossPips;
        if (rrRatio < 1.5) {
          console.log(`🤖 ${symbol} ENHANCED AI R:R ratio ${rrRatio.toFixed(2)}:1 below 1.5:1 minimum`);
          return { ...analysis, recommendation: 'HOLD' as const };
        }
      }
      
      return analysis;
      
    } catch (parseError) {
      console.error(`Error parsing ENHANCED AI response for ${symbol}:`, parseError);
      return null;
    }
    
  } catch (error) {
    console.error(`Error in ENHANCED AI analysis for ${pair.symbol}:`, error);
    return null;
  }
}

// Helper functions for enhanced analysis
function calculateATR(pricePoints: PricePoint[]): number {
  if (pricePoints.length < 2) return 0;
  
  let totalTrueRange = 0;
  for (let i = 1; i < pricePoints.length; i++) {
    const high = pricePoints[i].price;
    const low = pricePoints[i].price;
    const prevClose = pricePoints[i - 1].price;
    
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    totalTrueRange += trueRange;
  }
  
  return totalTrueRange / (pricePoints.length - 1);
}

function calculateTrendStrength(pricePoints: PricePoint[]): string {
  if (pricePoints.length < 20) return 'Insufficient data';
  
  const prices = pricePoints.map(p => p.price);
  const n = prices.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = prices.reduce((sum, price) => sum + price, 0);
  const sumXY = prices.reduce((sum, price, i) => sum + (i * price), 0);
  const sumX2 = prices.reduce((sum, _, i) => sum + (i * i), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgPrice = sumY / n;
  const slopeStrength = Math.abs(slope) / avgPrice;
  
  if (slopeStrength > 0.003) return slope > 0 ? 'Strong Bullish' : 'Strong Bearish';
  if (slopeStrength > 0.001) return slope > 0 ? 'Moderate Bullish' : 'Moderate Bearish';
  return 'Weak/Sideways';
}

function detectMarketRegime(pricePoints: PricePoint[], atr: number): string {
  if (pricePoints.length < 20) return 'Unknown';
  
  const prices = pricePoints.map(p => p.price);
  const currentPrice = prices[prices.length - 1];
  const volatilityRatio = atr / currentPrice;
  
  if (volatilityRatio > 0.025) return 'Highly Volatile';
  if (volatilityRatio > 0.015) return 'Moderately Volatile';
  
  const highestHigh = Math.max(...prices.slice(-20));
  const lowestLow = Math.min(...prices.slice(-20));
  const priceRange = highestHigh - lowestLow;
  const rangeRatio = priceRange / currentPrice;
  
  if (rangeRatio > 0.02) return 'Trending';
  return 'Ranging';
}

function getCurrentSessionAnalysis(): { session: string; volatility: string; recommendation: string } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  if (utcHour >= 8 && utcHour < 16) {
    return { session: 'European', volatility: 'High', recommendation: 'Favorable' };
  } else if (utcHour >= 13 && utcHour < 17) {
    return { session: 'London-NY Overlap', volatility: 'Very High', recommendation: 'Excellent' };
  } else if (utcHour >= 17 && utcHour < 22) {
    return { session: 'US', volatility: 'Moderate', recommendation: 'Good' };
  } else if (utcHour >= 0 && utcHour < 8) {
    return { session: 'Asian', volatility: 'Low-Moderate', recommendation: 'Caution' };
  }
  
  return { session: 'Low Activity', volatility: 'Very Low', recommendation: 'Avoid' };
}

function getEconomicContext(symbol: string): string {
  // Simplified economic context - in production, this would fetch from economic calendar
  const majorEventPairs = ['EURUSD', 'GBPUSD', 'USDJPY'];
  if (majorEventPairs.includes(symbol)) {
    return 'Monitor for major economic releases';
  }
  return 'Standard economic environment';
}

// Convert ENHANCED AI analysis to signal data format
async function convertEnhancedAIAnalysisToSignal(
  pair: any,
  aiAnalysis: EnhancedAISignalAnalysis,
  historicalData: PricePoint[]
): Promise<SignalData | null> {
  try {
    if (aiAnalysis.recommendation === 'HOLD' || aiAnalysis.qualityScore < 55) {
      return null;
    }

    const signal: SignalData = {
      symbol: pair.symbol,
      type: aiAnalysis.recommendation,
      price: aiAnalysis.entryPrice,
      pips: 0, // New signals start with 0 pips
      stopLoss: aiAnalysis.stopLoss,
      takeProfits: aiAnalysis.takeProfits,
      confidence: aiAnalysis.confidence,
      analysisText: `ENHANCED AI-powered ${aiAnalysis.recommendation} signal for ${pair.symbol}. ${aiAnalysis.reasoning} Technical factors: ${aiAnalysis.technicalFactors.join(', ')}. Risk assessment: ${aiAnalysis.riskAssessment} Market regime: ${aiAnalysis.marketRegime}. Session analysis: ${aiAnalysis.sessionAnalysis}. Quality Score: ${aiAnalysis.qualityScore}/100`,
      technicalIndicators: {
        enhancedAI: true,
        recommendation: aiAnalysis.recommendation,
        confidence: aiAnalysis.confidence,
        qualityScore: aiAnalysis.qualityScore,
        technicalFactors: aiAnalysis.technicalFactors,
        riskAssessment: aiAnalysis.riskAssessment,
        marketRegime: aiAnalysis.marketRegime,
        sessionAnalysis: aiAnalysis.sessionAnalysis
      },
      chartData: historicalData.slice(-100).map(point => ({
        time: point.timestamp,
        price: point.price
      }))
    };

    return signal;
  } catch (error) {
    console.error(`Error converting ENHANCED AI analysis to signal for ${pair.symbol}:`, error);
    return null;
  }
}
