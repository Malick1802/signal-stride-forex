
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting automated signal generation with confidence threshold...');

    // Check if forex markets are open
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    
    const isMarketOpen = (utcDay >= 1 && utcDay <= 4) || 
                        (utcDay === 0 && utcHour >= 22) || 
                        (utcDay === 5 && utcHour < 22);

    if (!isMarketOpen) {
      console.log('Markets closed, skipping signal generation');
      return new Response(
        JSON.stringify({ 
          message: 'Markets closed - no signals generated',
          marketOpen: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recent market data (last 4 hours for better analysis)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('*')
      .gte('created_at', fourHoursAgo)
      .order('created_at', { ascending: false });

    if (marketError || !marketData || marketData.length === 0) {
      console.error('No recent market data available:', marketError);
      return new Response(
        JSON.stringify({ 
          error: 'No recent market data available',
          suggestion: 'Run fetch-market-data function first'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing active signals to prevent duplicates
    const { data: existingSignals } = await supabase
      .from('trading_signals')
      .select('symbol')
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString());

    const existingSymbols = new Set(existingSignals?.map(s => s.symbol) || []);
    console.log('Existing active signals:', Array.from(existingSymbols));

    // Group market data by symbol and analyze for opportunities
    const symbolData: Record<string, any[]> = {};
    marketData.forEach(item => {
      if (item.symbol && item.price !== null) {
        if (!symbolData[item.symbol]) symbolData[item.symbol] = [];
        symbolData[item.symbol].push(item);
      }
    });

    // Set confidence threshold (only generate signals with 85%+ confidence)
    const CONFIDENCE_THRESHOLD = 85;
    const signalsGenerated = [];

    for (const [symbol, prices] of Object.entries(symbolData)) {
      try {
        // Skip if already has active signal
        if (existingSymbols.has(symbol)) {
          console.log(`Skipping ${symbol} - already has active signal`);
          continue;
        }

        // Ensure we have enough data points for analysis
        if (prices.length < 10) {
          console.log(`Skipping ${symbol} - insufficient data points (${prices.length})`);
          continue;
        }

        const sortedPrices = prices.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const currentPrice = Number(sortedPrices[0].price);
        
        if (currentPrice <= 0 || isNaN(currentPrice)) {
          console.log(`Skipping ${symbol} - invalid price: ${currentPrice}`);
          continue;
        }

        // Advanced opportunity detection with multiple indicators
        const { confidence, signalType, analysis } = await analyzeMarketOpportunity(
          symbol, sortedPrices, openAIApiKey
        );

        console.log(`${symbol}: Confidence ${confidence}%, Type: ${signalType}`);

        // Only generate signal if confidence meets threshold
        if (confidence < CONFIDENCE_THRESHOLD) {
          console.log(`Skipping ${symbol} - confidence ${confidence}% below threshold ${CONFIDENCE_THRESHOLD}%`);
          continue;
        }

        // Calculate precise levels
        const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
        const stopLossDistance = signalType === 'BUY' ? -30 * pipValue : 30 * pipValue;
        const takeProfitDistances = [50 * pipValue, 80 * pipValue, 120 * pipValue];
        
        if (signalType === 'SELL') {
          takeProfitDistances.forEach((_, i) => takeProfitDistances[i] *= -1);
        }

        const stopLoss = parseFloat((currentPrice + stopLossDistance).toFixed(symbol.includes('JPY') ? 3 : 5));
        const takeProfits = takeProfitDistances.map(distance => 
          parseFloat((currentPrice + distance).toFixed(symbol.includes('JPY') ? 3 : 5))
        );

        // Insert high-confidence signal
        const signalData = {
          symbol,
          type: signalType,
          price: currentPrice,
          stop_loss: stopLoss,
          take_profits: takeProfits,
          confidence: Math.round(confidence),
          pips: Math.abs(takeProfitDistances[0] / pipValue),
          is_centralized: true,
          user_id: null,
          status: 'active',
          analysis_text: analysis,
          asset_type: 'FOREX'
        };

        const { data: signal, error: signalError } = await supabase
          .from('trading_signals')
          .insert(signalData)
          .select()
          .single();

        if (signalError) {
          console.error(`Error inserting signal for ${symbol}:`, signalError);
          continue;
        }

        // Insert AI analysis record
        if (signal) {
          await supabase
            .from('ai_analysis')
            .insert({
              signal_id: signal.id,
              analysis_text: analysis,
              confidence_score: confidence,
              market_conditions: {
                symbol,
                currentPrice,
                signalType,
                marketOpen: isMarketOpen,
                timestamp: now.toISOString(),
                dataPoints: prices.length
              }
            });
        }

        signalsGenerated.push({
          symbol,
          confidence: Math.round(confidence),
          type: signalType
        });
        
        console.log(`✓ Generated high-confidence signal: ${symbol} ${signalType} (${confidence}%)`);
        
      } catch (symbolError) {
        console.error(`Error processing ${symbol}:`, symbolError);
        continue;
      }
    }

    console.log(`Automated signal generation complete: ${signalsGenerated.length} high-confidence signals`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${signalsGenerated.length} signals above ${CONFIDENCE_THRESHOLD}% confidence`,
        signals: signalsGenerated,
        threshold: CONFIDENCE_THRESHOLD,
        marketOpen: isMarketOpen,
        automated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in automated signal generation:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Advanced market opportunity analysis function
async function analyzeMarketOpportunity(
  symbol: string, 
  prices: any[], 
  openAIApiKey: string | undefined
): Promise<{ confidence: number; signalType: string; analysis: string }> {
  
  const currentPrice = Number(prices[0].price);
  
  // Calculate multiple technical indicators
  const priceChanges = [];
  const volumes = [];
  
  for (let i = 1; i < Math.min(prices.length, 20); i++) {
    const change = (currentPrice - Number(prices[i].price)) / Number(prices[i].price);
    priceChanges.push(change);
  }
  
  // Momentum analysis
  const shortTermMomentum = priceChanges.slice(0, 5).reduce((sum, change) => sum + change, 0) / 5;
  const longTermMomentum = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
  
  // Volatility analysis
  const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
  const volatility = Math.sqrt(
    priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length
  );
  
  // Support/Resistance levels
  const recentPrices = prices.slice(0, 15).map(p => Number(p.price));
  const support = Math.min(...recentPrices);
  const resistance = Math.max(...recentPrices);
  const pricePosition = (currentPrice - support) / (resistance - support);
  
  // Signal determination with confidence calculation
  let confidence = 70; // Base confidence
  let signalType = 'BUY';
  
  // Momentum-based signal
  if (shortTermMomentum > 0.0008) {
    signalType = 'BUY';
    confidence += 15;
  } else if (shortTermMomentum < -0.0008) {
    signalType = 'SELL';
    confidence += 15;
  }
  
  // Volatility consideration
  if (volatility > 0.001 && volatility < 0.005) {
    confidence += 10; // Good volatility range
  } else if (volatility > 0.008) {
    confidence -= 20; // Too volatile
  }
  
  // Support/Resistance analysis
  if (signalType === 'BUY' && pricePosition < 0.3) {
    confidence += 15; // Buying near support
  } else if (signalType === 'SELL' && pricePosition > 0.7) {
    confidence += 15; // Selling near resistance
  }
  
  // Trend consistency
  const trendConsistency = Math.abs(shortTermMomentum - longTermMomentum);
  if (trendConsistency < 0.0005) {
    confidence += 10; // Consistent trend
  }
  
  // Cap confidence at 98%
  confidence = Math.min(98, Math.max(60, confidence));
  
  // Generate analysis text
  let analysis = `High-confidence ${signalType} opportunity detected for ${symbol}. `;
  analysis += `Technical analysis shows ${shortTermMomentum > 0 ? 'bullish' : 'bearish'} momentum `;
  analysis += `with ${confidence}% confidence. Price action near ${pricePosition > 0.5 ? 'resistance' : 'support'} levels. `;
  analysis += `Volatility: ${(volatility * 100).toFixed(3)}%. Ideal for ${confidence >= 90 ? 'aggressive' : 'moderate'} position sizing.`;
  
  // Enhance with AI analysis if available
  if (openAIApiKey && confidence >= 88) {
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are a professional forex analyst. Provide concise market analysis with key levels and risk assessment.'
            },
            {
              role: 'user',
              content: `Analyze ${symbol} ${signalType} signal at ${currentPrice} with ${confidence}% confidence. Current momentum: ${(shortTermMomentum * 100).toFixed(3)}%, volatility: ${(volatility * 100).toFixed(3)}%. Provide key insights in 100 words.`
            }
          ],
          max_tokens: 150,
          temperature: 0.3
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const aiAnalysis = aiData.choices?.[0]?.message?.content;
        if (aiAnalysis) {
          analysis = aiAnalysis;
        }
      }
    } catch (aiError) {
      console.error(`AI analysis failed for ${symbol}:`, aiError);
    }
  }
  
  return { confidence, signalType, analysis };
}
