
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🤖 Starting automated signal analysis...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get latest market data for analysis
    const { data: marketData, error: marketError } = await supabase
      .from('centralized_market_state')
      .select('*')
      .order('last_update', { ascending: false });

    if (marketError || !marketData?.length) {
      console.log('⚠️ No market data available for analysis');
      return new Response(
        JSON.stringify({ message: 'No market data available', signals: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Priority pairs for analysis
    const priorityPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'GBPJPY'];
    const signalsGenerated = [];

    for (const pair of priorityPairs) {
      try {
        const pairData = marketData.find(item => item.symbol === pair);
        if (!pairData) continue;

        // Get historical data for the pair
        const { data: historicalData } = await supabase
          .from('live_market_data')
          .select('*')
          .eq('symbol', pair)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (!historicalData?.length) continue;

        // Analyze with OpenAI
        const analysisResult = await analyzeMarketWithAI(pair, pairData, historicalData, openAIApiKey);
        
        if (analysisResult.shouldTrade && analysisResult.confidence >= 90) {
          console.log(`✨ High confidence signal found for ${pair}: ${analysisResult.confidence}%`);
          
          // Generate signal
          const signal = await generateSignalFromAnalysis(pair, pairData, analysisResult, supabase);
          if (signal) {
            signalsGenerated.push(signal);
          }
        }
      } catch (error) {
        console.error(`❌ Error analyzing ${pair}:`, error);
      }
    }

    console.log(`✅ Automated analysis complete. Generated ${signalsGenerated.length} high-confidence signals`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${signalsGenerated.length} automated signals`,
        signals: signalsGenerated,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in automated signal analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeMarketWithAI(pair: string, currentData: any, historicalData: any[], openAIApiKey: string) {
  const currentPrice = parseFloat(currentData.current_price.toString());
  const priceHistory = historicalData.slice(0, 20).map(d => parseFloat(d.price.toString()));
  
  // Calculate technical indicators
  const priceChange24h = currentData.price_change_24h || 0;
  const volatility = calculateVolatility(priceHistory);
  const momentum = calculateMomentum(priceHistory);
  const support = Math.min(...priceHistory);
  const resistance = Math.max(...priceHistory);

  const prompt = `
    Analyze ${pair} for trading opportunities:
    
    Current Price: ${currentPrice}
    24h Change: ${priceChange24h}%
    Volatility: ${volatility.toFixed(4)}
    Momentum: ${momentum.toFixed(4)}
    Support Level: ${support}
    Resistance Level: ${resistance}
    Recent Prices: ${priceHistory.slice(0, 10).join(', ')}
    
    Provide analysis in this exact JSON format:
    {
      "shouldTrade": boolean,
      "direction": "BUY" or "SELL",
      "confidence": number (0-100),
      "entryPrice": number,
      "stopLoss": number,
      "takeProfits": [number, number, number],
      "analysis": "detailed analysis text",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH"
    }
    
    Only recommend trades with 90%+ confidence based on strong technical signals.
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert forex analyst. Provide precise technical analysis and only recommend high-confidence trades. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;
    
    if (analysisText) {
      return JSON.parse(analysisText);
    }
    
    return { shouldTrade: false, confidence: 0 };
  } catch (error) {
    console.error(`Error in AI analysis for ${pair}:`, error);
    return { shouldTrade: false, confidence: 0 };
  }
}

async function generateSignalFromAnalysis(pair: string, marketData: any, analysis: any, supabase: any) {
  try {
    // Create detailed chart data
    const chartData = [];
    const baseTime = Date.now() - (30 * 60 * 1000);
    const entryPrice = analysis.entryPrice || parseFloat(marketData.current_price.toString());
    
    for (let i = 0; i < 30; i++) {
      const timePoint = baseTime + (i * 60 * 1000);
      const variation = (Math.sin(i * 0.2) + Math.random() * 0.2 - 0.1) * (entryPrice * 0.0002);
      chartData.push({
        time: timePoint,
        price: parseFloat((entryPrice + variation).toFixed(5))
      });
    }

    const signal = {
      symbol: pair,
      type: analysis.direction,
      price: parseFloat(entryPrice.toFixed(5)),
      stop_loss: parseFloat(analysis.stopLoss.toFixed(5)),
      take_profits: analysis.takeProfits.map((tp: number) => parseFloat(tp.toFixed(5))),
      confidence: analysis.confidence,
      status: 'active',
      is_centralized: true,
      user_id: null,
      analysis_text: `AI-Generated Signal: ${analysis.analysis}`,
      chart_data: chartData,
      pips: Math.floor(Math.abs(entryPrice - analysis.stopLoss) * 10000),
      created_at: new Date().toISOString()
    };

    const { data: insertedSignal, error } = await supabase
      .from('trading_signals')
      .insert(signal)
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting automated signal:', error);
      return null;
    }

    // Create detailed AI analysis record
    await supabase
      .from('ai_analysis')
      .insert({
        signal_id: insertedSignal.id,
        analysis_text: analysis.analysis,
        confidence_score: analysis.confidence,
        market_conditions: {
          riskLevel: analysis.riskLevel,
          generatedAt: new Date().toISOString(),
          symbol: pair,
          automated: true
        }
      });

    console.log(`✅ Generated automated signal for ${pair}: ${analysis.direction} at ${entryPrice}`);
    return insertedSignal;
  } catch (error) {
    console.error('Error generating signal from analysis:', error);
    return null;
  }
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

function calculateMomentum(prices: number[]): number {
  if (prices.length < 10) return 0;
  const recent = prices.slice(0, 5).reduce((sum, p) => sum + p, 0) / 5;
  const older = prices.slice(5, 10).reduce((sum, p) => sum + p, 0) / 5;
  return (recent - older) / older;
}
