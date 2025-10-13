export interface StrategyContext {
  strategy_type: 'trend_continuation' | 'head_and_shoulders_reversal' | 'confluence_reversal';
  symbol: string;
  signal_type: 'BUY' | 'SELL';
  entry_price: number;
  stop_loss: number;
  take_profits: number[];
  
  timeframe_confluence?: {
    weekly: 'bullish' | 'bearish' | 'neutral';
    daily: 'bullish' | 'bearish' | 'neutral';
    fourHour: 'bullish' | 'bearish' | 'neutral';
    aligned: string[];
  };
  
  entry_timeframe?: '4H' | '1H';
  
  aoi_zones?: {
    support: Array<{ price: number; strength: number }>;
    resistance: Array<{ price: number; strength: number }>;
  } | null;
  
  structure_points?: Array<{
    type: string;
    price: number;
  }>;
  
  pattern_detected?: string;
  pattern_confidence?: number;
  
  ema50?: number;
  candlestick_patterns?: Array<{
    name: string;
    type: 'bullish' | 'bearish';
    confidence: number;
  }>;
  
  risk_pips: number;
  reward_pips: number;
  rrr: number;
}

function getPipValue(symbol: string): number {
  return symbol.includes('JPY') ? 0.01 : 0.0001;
}

export function buildStrategyContext(signal: any): StrategyContext {
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

export function generateStrategyPrompt(context: StrategyContext): string {
  const basePrompt = `You are a professional forex analyst validating a ${context.strategy_type.replace(/_/g, ' ')} signal for ${context.symbol}.

SIGNAL DETAILS:
- Type: ${context.signal_type}
- Entry: ${context.entry_price.toFixed(5)}
- Stop Loss: ${context.stop_loss.toFixed(5)}
- Take Profits: ${context.take_profits.map(tp => tp.toFixed(5)).join(', ')}
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
${context.aoi_zones ? `- AOI Zones: Support: ${context.aoi_zones.support.map(s => s.price.toFixed(5)).join(', ')}, Resistance: ${context.aoi_zones.resistance.map(r => r.price.toFixed(5)).join(', ')}` : '- AOI analysis pending'}
${context.structure_points ? `- Structure: ${context.structure_points.map(p => `${p.type} @ ${p.price.toFixed(5)}`).join(', ')}` : ''}
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
${context.structure_points ? `- Structure: ${context.structure_points.map(p => `${p.type} @ ${p.price.toFixed(5)}`).join(', ')}` : ''}
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
