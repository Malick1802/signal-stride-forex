
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

    // Fetch recent market data
    const { data: marketData, error: fetchError } = await supabase
      .from('live_market_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch market data: ${fetchError.message}`);
    }

    if (!marketData || marketData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No market data available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group data by symbol
    const symbolData = marketData.reduce((acc, item) => {
      if (!acc[item.symbol]) acc[item.symbol] = [];
      acc[item.symbol].push(item);
      return acc;
    }, {});

    // Generate signals for each symbol
    for (const [symbol, prices] of Object.entries(symbolData)) {
      if ((prices as any[]).length < 5) continue; // Need at least 5 data points

      const recentPrices = (prices as any[]).slice(0, 10).map(p => p.price);
      const currentPrice = recentPrices[0];
      
      // Simple technical analysis
      const avg5 = recentPrices.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const avg10 = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      
      const trend = avg5 > avg10 ? 'bullish' : 'bearish';
      const signalType = trend === 'bullish' ? 'BUY' : 'SELL';
      
      // Use OpenAI for analysis
      const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are a professional forex analyst. Provide concise technical analysis based on price data.'
            },
            {
              role: 'user',
              content: `Analyze ${symbol} with current price ${currentPrice}, 5-period average ${avg5.toFixed(5)}, 10-period average ${avg10.toFixed(5)}. The trend appears ${trend}. Provide a confidence score (1-100) and brief analysis for a ${signalType} signal.`
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        }),
      });

      const analysisData = await analysisResponse.json();
      const analysis = analysisData.choices?.[0]?.message?.content || 'Technical analysis based on moving averages';
      
      // Extract confidence score from analysis or calculate based on trend strength
      const trendStrength = Math.abs(avg5 - avg10) / currentPrice * 10000; // in pips
      const confidence = Math.min(95, Math.max(70, 70 + trendStrength * 5));
      
      // Calculate stop loss and take profit levels
      const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
      const stopLossDistance = signalType === 'BUY' ? -30 * pipValue : 30 * pipValue;
      const takeProfitDistance = signalType === 'BUY' ? 50 * pipValue : -50 * pipValue;
      
      const stopLoss = currentPrice + stopLossDistance;
      const takeProfit1 = currentPrice + takeProfitDistance;
      const takeProfit2 = currentPrice + (takeProfitDistance * 1.5);
      const takeProfit3 = currentPrice + (takeProfitDistance * 2);

      // Insert the signal
      const { data: signal, error: signalError } = await supabase
        .from('trading_signals')
        .insert({
          symbol,
          type: signalType,
          price: currentPrice,
          stop_loss: stopLoss,
          take_profits: [takeProfit1, takeProfit2, takeProfit3],
          confidence: confidence,
          pips: Math.abs(takeProfitDistance / pipValue),
          is_centralized: true,
          user_id: null,
          status: 'active',
          analysis_text: analysis,
          asset_type: 'FOREX'
        })
        .select()
        .single();

      if (signalError) {
        console.error(`Error inserting signal for ${symbol}:`, signalError);
        continue;
      }

      // Insert AI analysis
      if (signal) {
        await supabase
          .from('ai_analysis')
          .insert({
            signal_id: signal.id,
            analysis_text: analysis,
            confidence_score: confidence,
            market_conditions: {
              trend,
              avg5,
              avg10,
              currentPrice,
              symbol
            }
          });
      }

      console.log(`Generated signal for ${symbol}: ${signalType} at ${currentPrice}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Signals generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-signals function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
