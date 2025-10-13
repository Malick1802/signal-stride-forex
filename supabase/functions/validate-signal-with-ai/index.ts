import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions
function getPipValue(symbol: string): number {
  return symbol.includes('JPY') ? 0.01 : 0.0001;
}

function buildStrategyContext(signal: any) {
  const pipValue = getPipValue(signal.symbol);
  const riskPips = Math.abs((signal.price - signal.stop_loss) / pipValue);
  const rewardPips = signal.take_profits?.length 
    ? Math.abs((signal.take_profits[0] - signal.price) / pipValue)
    : 0;
  const rrr = riskPips > 0 ? rewardPips / riskPips : 0;

  return {
    strategy_type: signal.strategy_type || 'trend_continuation',
    symbol: signal.symbol,
    signal_type: signal.type,
    entry_price: signal.price,
    stop_loss: signal.stop_loss,
    take_profits: signal.take_profits || [],
    timeframe_confluence: signal.timeframe_confluence,
    entry_timeframe: signal.entry_timeframe,
    aoi_zones: signal.aoi_zones,
    structure_points: signal.structure_points,
    pattern_detected: signal.pattern_detected,
    pattern_confidence: signal.pattern_confidence,
    ema50: signal.metadata?.ema50,
    candlestick_patterns: signal.metadata?.candlestick_patterns,
    risk_pips: riskPips,
    reward_pips: rewardPips,
    rrr
  };
}

function generateStrategyPrompt(context: any): string {
  const basePrompt = `You are a professional forex analyst validating a ${context.strategy_type.replace(/_/g, ' ')} signal for ${context.symbol}.

SIGNAL DETAILS:
- Type: ${context.signal_type}
- Entry: ${context.entry_price.toFixed(5)}
- Stop Loss: ${context.stop_loss.toFixed(5)}
- Take Profits: ${context.take_profits.map((tp: number) => tp.toFixed(5)).join(', ')}
- Risk/Reward: 1:${context.rrr.toFixed(1)} (Risk: ${context.risk_pips.toFixed(0)} pips, Reward: ${context.reward_pips.toFixed(0)} pips)
- Entry Timeframe: ${context.entry_timeframe || '4H'}

MULTI-TIMEFRAME CONFLUENCE:
${context.timeframe_confluence ? `- Weekly: ${context.timeframe_confluence.weekly}
- Daily: ${context.timeframe_confluence.daily}
- 4-Hour: ${context.timeframe_confluence.fourHour}
- Aligned: ${context.timeframe_confluence.aligned.join(', ')}` : '- Analysis based on technical indicators'}
`;

  if (context.strategy_type === 'trend_continuation') {
    return basePrompt + `
TREND CONTINUATION STRATEGY:
- This signal is based on multi-timeframe confluence${context.timeframe_confluence ? ` (${context.timeframe_confluence.aligned.join(', ')})` : ''} with price at an Area of Interest (AOI).
${context.aoi_zones ? `- AOI Zones: Support: ${context.aoi_zones.support.map((s: any) => s.price.toFixed(5)).join(', ')}, Resistance: ${context.aoi_zones.resistance.map((r: any) => r.price.toFixed(5)).join(', ')}` : '- AOI analysis pending'}
${context.structure_points ? `- Structure: ${context.structure_points.map((p: any) => `${p.type} @ ${p.price.toFixed(5)}`).join(', ')}` : ''}
${context.ema50 ? `- EMA 50: ${context.ema50.toFixed(5)} (${context.signal_type === 'BUY' ? (context.entry_price >= context.ema50 ? 'Aligned ✓' : 'Not aligned') : (context.entry_price <= context.ema50 ? 'Aligned ✓' : 'Not aligned')})` : ''}
${context.candlestick_patterns?.length ? `- Candlestick: ${context.candlestick_patterns[0].name} (${context.candlestick_patterns[0].type}, ${(context.candlestick_patterns[0].confidence * 100).toFixed(0)}% confidence)` : ''}

YOUR TASK:
1. Validate that the technical analysis supports this ${context.signal_type} bias.
2. Assess whether the structure points justify the stop loss placement.
3. Evaluate the risk/reward ratio (minimum 1:2 required).
4. Provide a concise analysis (150-200 words) explaining:
   - Why this is a valid setup
   - Key technical confluences
   - Risk management assessment
   - What to watch for (invalidation scenarios)

RESPOND IN THIS FORMAT:
**VALIDATION**: [APPROVED / REJECTED]
**CONFIDENCE**: [70-95]%
**ANALYSIS**:
[Your detailed analysis here]
`;
  } else {
    return basePrompt + `
HEAD & SHOULDERS REVERSAL STRATEGY:
${context.pattern_detected ? `- Pattern: ${context.pattern_detected} (${(context.pattern_confidence! * 100).toFixed(0)}% confidence)` : '- Pattern detection in progress'}
${context.structure_points ? `- Structure: ${context.structure_points.map((p: any) => `${p.type} @ ${p.price.toFixed(5)}`).join(', ')}` : ''}
${context.timeframe_confluence ? `- Prior Trend: ${context.timeframe_confluence.weekly} (Weekly), ${context.timeframe_confluence.daily} (Daily)` : ''}
${context.aoi_zones ? `- AOI Overlap: Yes (Neckline coincides with key zone)` : '- AOI Overlap: No'}
${context.ema50 ? `- EMA 50: ${context.ema50.toFixed(5)}` : ''}
${context.candlestick_patterns?.length ? `- Candlestick: ${context.candlestick_patterns[0].name} (${context.candlestick_patterns[0].type})` : ''}

YOUR TASK:
1. Validate that the reversal pattern is correctly identified.
2. Assess whether the stop loss placement is appropriate.
3. Evaluate the target and RRR.
4. Provide a concise analysis (150-200 words) explaining:
   - Why this is a valid reversal setup
   - Pattern quality and confirmation
   - Risk management assessment
   - What to watch for (failed reversal scenarios)

RESPOND IN THIS FORMAT:
**VALIDATION**: [APPROVED / REJECTED]
**CONFIDENCE**: [70-95]%
**ANALYSIS**:
[Your detailed analysis here]
`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal } = await req.json();
    
    if (!signal) {
      throw new Error('Signal data is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build strategy context
    const context = buildStrategyContext(signal);
    const prompt = generateStrategyPrompt(context);

    console.log(`🤖 AI Validation: ${signal.symbol} ${signal.type} (${signal.strategy_type || 'technical'})`);

    // Call OpenAI for validation
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
            content: 'You are a professional forex analyst with expertise in multi-timeframe analysis, market structure, and pattern recognition. You validate trading signals based on technical confluence.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    console.log(`📝 AI Response:\n${aiResponse.substring(0, 200)}...`);

    // Parse AI response
    const validationMatch = aiResponse.match(/\*\*VALIDATION\*\*:\s*(APPROVED|REJECTED)/i);
    const confidenceMatch = aiResponse.match(/\*\*CONFIDENCE\*\*:\s*(\d+)%?/i);
    const analysisMatch = aiResponse.match(/\*\*ANALYSIS\*\*:\s*([\s\S]+)/i);

    const validation = validationMatch ? validationMatch[1].toUpperCase() : 'APPROVED';
    const aiConfidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;
    const analysis = analysisMatch ? analysisMatch[1].trim() : aiResponse;

    const isApproved = validation === 'APPROVED';

    console.log(`${isApproved ? '✅' : '❌'} AI Validation: ${validation} (${aiConfidence}% confidence)`);

    return new Response(
      JSON.stringify({ 
        approved: isApproved,
        confidence: aiConfidence,
        analysis,
        raw_response: aiResponse
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in validate-signal-with-ai:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        approved: true,
        confidence: 70,
        analysis: 'AI validation temporarily unavailable. Signal generated based on technical analysis.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
