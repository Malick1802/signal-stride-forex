
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
    const { signalId } = await req.json();
    
    if (!signalId) {
      return new Response(
        JSON.stringify({ error: 'Signal ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the signal
    const { data: signal, error: signalError } = await supabase
      .from('trading_signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (signalError || !signal) {
      return new Response(
        JSON.stringify({ error: 'Signal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent market data for the symbol
    const { data: marketData, error: marketError } = await supabase
      .from('live_market_data')
      .select('*')
      .eq('symbol', signal.symbol)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (marketError) {
      throw new Error(`Failed to fetch market data: ${marketError.message}`);
    }

    // Prepare market analysis context
    const recentPrices = marketData?.map(d => d.price) || [];
    const currentPrice = recentPrices[0] || signal.price;
    const priceChange = recentPrices.length > 1 ? ((currentPrice - recentPrices[recentPrices.length - 1]) / recentPrices[recentPrices.length - 1] * 100) : 0;

    // Generate detailed AI analysis
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
            content: 'You are a professional forex analyst providing detailed technical analysis. Be specific about entry points, risk management, and market conditions.'
          },
          {
            role: 'user',
            content: `Provide detailed analysis for ${signal.symbol} ${signal.type} signal:
            - Current Price: ${currentPrice}
            - Signal Entry: ${signal.price}
            - Stop Loss: ${signal.stop_loss}
            - Take Profits: ${signal.take_profits?.join(', ')}
            - Recent Price Change: ${priceChange.toFixed(2)}%
            - Confidence: ${signal.confidence}%
            
            Include technical indicators, market sentiment, and risk assessment.`
          }
        ],
        max_tokens: 500,
        temperature: 0.4
      }),
    });

    const analysisData = await analysisResponse.json();
    const detailedAnalysis = analysisData.choices?.[0]?.message?.content || 'Unable to generate analysis';

    // Store or update the AI analysis
    const { error: analysisError } = await supabase
      .from('ai_analysis')
      .upsert({
        signal_id: signalId,
        analysis_text: detailedAnalysis,
        confidence_score: signal.confidence,
        market_conditions: {
          currentPrice,
          priceChange,
          timestamp: new Date().toISOString(),
          symbol: signal.symbol
        }
      });

    if (analysisError) {
      console.error('Error storing AI analysis:', analysisError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: detailedAnalysis,
        confidence: signal.confidence,
        marketData: {
          currentPrice,
          priceChange: priceChange.toFixed(2)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
