// Phase 3: Enhanced AI Prompt Engineering for Market Regime Analysis
export interface AIAnalysisContext {
  marketRegime: 'trending' | 'ranging' | 'volatile' | 'breakout';
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme';
  session: 'Asian' | 'London' | 'NY' | 'Overlap';
  economicEvents: { hasNearbyEvents: boolean; impactLevel: string };
  supportResistance: { supports: number[]; resistances: number[]; strength: number };
}

// Enhanced Tier 2 AI prompts focusing on market regime analysis
export const generateEnhancedTier2Prompt = (
  symbol: string,
  currentPrice: number,
  indicators: any,
  context: AIAnalysisContext,
  tier1Score: number
): string => {
  const basePrompt = `You are a professional forex trading analyst specializing in ${context.marketRegime} market conditions during the ${context.session} session.

CRITICAL ANALYSIS REQUIREMENTS:
- Market Regime: ${context.marketRegime.toUpperCase()} (adapt strategy accordingly)
- Volatility: ${context.volatilityProfile.toUpperCase()} (adjust risk management)
- Session: ${context.session} (consider typical behavior)
- Economic Context: ${context.economicEvents.hasNearbyEvents ? `${context.economicEvents.impactLevel} impact events nearby` : 'Clear economic calendar'}

MARKET DATA FOR ${symbol}:
- Current Price: ${currentPrice}
- RSI: ${indicators.rsi?.toFixed(2)}
- MACD Line: ${indicators.macd?.line?.toFixed(5)}
- MACD Signal: ${indicators.macd?.signal?.toFixed(5)}
- EMA50: ${indicators.ema50?.toFixed(5)}
- EMA200: ${indicators.ema200?.toFixed(5)}
- ATR: ${indicators.atr?.toFixed(6)}
- Support Levels: ${context.supportResistance.supports.join(', ')}
- Resistance Levels: ${context.supportResistance.resistances.join(', ')}

REGIME-SPECIFIC ANALYSIS:`;

  // Market regime-specific prompting
  let regimeSpecificPrompt = '';
  
  switch (context.marketRegime) {
    case 'trending':
      regimeSpecificPrompt = `
TRENDING MARKET STRATEGY:
- Focus on trend continuation signals
- Look for pullbacks to key moving averages
- Confirm momentum alignment with trend direction
- Target extended moves with trailing stops
- Avoid counter-trend signals unless extremely oversold/overbought

TRENDING MARKET CHECKLIST:
1. Is price respecting the dominant trend direction?
2. Are we seeing healthy pullbacks or exhaustion signs?
3. Is momentum confirming the trend strength?
4. Are we near significant support/resistance that could hold?`;
      break;

    case 'ranging':
      regimeSpecificPrompt = `
RANGING MARKET STRATEGY:
- Focus on mean reversion at range boundaries
- Look for oversold/overbought conditions
- Target opposite range boundary
- Use tighter stops due to limited movement
- Avoid breakout signals unless confirmed with volume

RANGING MARKET CHECKLIST:
1. Are we near established range boundaries?
2. Is RSI showing clear oversold/overbought readings?
3. Is price showing rejection at support/resistance?
4. Are we seeing signs of range continuation or breakout?`;
      break;

    case 'volatile':
      regimeSpecificPrompt = `
VOLATILE MARKET STRATEGY:
- Use wider stops to avoid whipsaws
- Reduce position sizes due to increased risk
- Focus on clear directional momentum
- Avoid signals during peak volatility spikes
- Look for volatility expansion/contraction patterns

VOLATILE MARKET CHECKLIST:
1. Is volatility expanding or contracting?
2. Can we identify the volatility driver?
3. Is there clear directional bias despite noise?
4. Are we using appropriate risk management for this environment?`;
      break;

    case 'breakout':
      regimeSpecificPrompt = `
BREAKOUT MARKET STRATEGY:
- Focus on momentum confirmation
- Look for volume expansion (if available)
- Target measured moves from breakout points
- Use breakout-specific stop placement
- Avoid late entries after extended moves

BREAKOUT MARKET CHECKLIST:
1. Is this a clean breakout of significant level?
2. Is momentum confirming the breakout direction?
3. Are we early enough in the breakout move?
4. Is the breakout target realistic given ATR?`;
      break;
  }

  // Session-specific considerations
  const sessionPrompt = `
${context.session.toUpperCase()} SESSION CONSIDERATIONS:
${context.session === 'Overlap' ? 
  '- Highest liquidity and volatility period\n- Major news releases likely\n- Expect stronger directional moves\n- Use wider targets' :
  context.session === 'London' ?
  '- European market activity\n- EUR, GBP pairs most active\n- Focus on European economic data impact\n- Medium to high volatility expected' :
  context.session === 'NY' ?
  '- US market activity\n- USD pairs most active\n- Focus on US economic data\n- Strong directional moves possible' :
  '- Lower liquidity period\n- JPY and commodity currencies more active\n- Expect smaller ranges\n- Use tighter targets'
}`;

  // Volatility-adjusted risk management
  const volatilityPrompt = `
VOLATILITY-ADJUSTED RISK MANAGEMENT:
Current ATR suggests ${context.volatilityProfile} volatility environment.

${context.volatilityProfile === 'extreme' ?
  '- Use 3.5-4.0x ATR for stops\n- Reduce position size by 50%\n- Target 2.5-3.0:1 minimum R:R\n- Avoid signals during volatility spikes' :
  context.volatilityProfile === 'high' ?
  '- Use 3.0-3.5x ATR for stops\n- Reduce position size by 25%\n- Target 2.5:1 minimum R:R\n- Be cautious of false breakouts' :
  context.volatilityProfile === 'normal' ?
  '- Use 2.5-3.0x ATR for stops\n- Standard position sizing\n- Target 2.0:1 minimum R:R\n- Normal signal confidence' :
  '- Use 2.0-2.5x ATR for stops\n- Can increase position size slightly\n- Target 1.8:1 minimum R:R\n- Look for range-bound strategies'
}`;

  // Anti-bias directive
  const antiBiasPrompt = `
CRITICAL: AVOID OVER-CONSERVATIVE BIAS
- This market regime typically produces ${context.marketRegime === 'trending' ? 'strong directional moves' : context.marketRegime === 'volatile' ? 'sharp but short-term moves' : 'mean-reverting patterns'}
- Don't reject viable signals due to excessive caution
- Consider the typical success rate for ${context.marketRegime} strategies: ${context.marketRegime === 'trending' ? '65-75%' : context.marketRegime === 'ranging' ? '60-70%' : '50-60%'}
- If tier 1 score is ${tier1Score}/100, adjust confidence accordingly
- Market conditions ${context.session === 'Overlap' ? 'are optimal' : context.session === 'Asian' ? 'are challenging' : 'are favorable'} for signal generation`;

  const outputPrompt = `
Based on this analysis, provide a JSON response with:
{
  "shouldSignal": boolean,
  "signalType": "BUY" | "SELL",
  "confidence": number (50-100),
  "qualityScore": number (50-100),
  "entryPrice": number,
  "stopLoss": number,
  "takeProfits": [array of 3-4 levels],
  "analysis": "detailed reasoning",
  "confluenceFactors": [array of confirming factors],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "regimeAlignment": boolean,
  "sessionOptimal": boolean
}

MINIMUM QUALITY THRESHOLDS FOR ${context.marketRegime.toUpperCase()} REGIME:
- Confidence: ${context.marketRegime === 'trending' ? '70%' : context.marketRegime === 'ranging' ? '65%' : '60%'}
- Quality Score: ${context.marketRegime === 'trending' ? '75' : context.marketRegime === 'ranging' ? '70' : '65'}
- Minimum confluences: ${context.marketRegime === 'trending' ? '3' : '2'} factors`;

  return `${basePrompt}\n${regimeSpecificPrompt}\n${sessionPrompt}\n${volatilityPrompt}\n${antiBiasPrompt}\n${outputPrompt}`;
};

// Enhanced Tier 3 validation prompt with dynamic criteria
export const generateEnhancedTier3Prompt = (
  symbol: string,
  tier2Analysis: any,
  context: AIAnalysisContext,
  correlationData?: any
): string => {
  return `You are a senior risk management analyst performing final validation for a ${tier2Analysis.signalType} signal on ${symbol}.

SIGNAL VALIDATION DATA:
- Entry: ${tier2Analysis.entryPrice}
- Stop Loss: ${tier2Analysis.stopLoss}
- Take Profits: ${tier2Analysis.takeProfits.join(', ')}
- Confidence: ${tier2Analysis.confidence}%
- Quality Score: ${tier2Analysis.qualityScore}
- Risk Level: ${tier2Analysis.riskLevel}
- Regime Alignment: ${tier2Analysis.regimeAlignment}

MARKET CONTEXT VALIDATION:
- Market Regime: ${context.marketRegime} (${tier2Analysis.regimeAlignment ? 'ALIGNED' : 'MISALIGNED'})
- Session: ${context.session} (${tier2Analysis.sessionOptimal ? 'OPTIMAL' : 'SUBOPTIMAL'})
- Volatility: ${context.volatilityProfile}
- Economic Events: ${context.economicEvents.hasNearbyEvents ? `${context.economicEvents.impactLevel} impact nearby` : 'Clear'}

RISK MANAGEMENT VALIDATION:
1. Stop Loss Distance: ${Math.abs(tier2Analysis.entryPrice - tier2Analysis.stopLoss).toFixed(5)} (${((Math.abs(tier2Analysis.entryPrice - tier2Analysis.stopLoss) / tier2Analysis.entryPrice) * 100).toFixed(2)}%)
2. Risk-Reward Ratios: ${tier2Analysis.takeProfits.map((tp: number) => ((Math.abs(tp - tier2Analysis.entryPrice) / Math.abs(tier2Analysis.entryPrice - tier2Analysis.stopLoss)).toFixed(1) + ':1')).join(', ')}
3. Minimum R:R Required: ${context.volatilityProfile === 'extreme' ? '2.5:1' : context.volatilityProfile === 'high' ? '2.0:1' : '1.8:1'}

CORRELATION RISK:
${correlationData ? `Existing signals may have correlation risks with ${symbol}` : 'No significant correlation conflicts detected'}

REGIME-SPECIFIC VALIDATION CRITERIA:
${context.marketRegime === 'trending' ? 
  '- Trend alignment is CRITICAL\n- Momentum must be confirmed\n- Require 75+ quality score\n- Target 80%+ confidence' :
  context.marketRegime === 'ranging' ? 
  '- Support/resistance levels critical\n- Mean reversion setup required\n- Require 70+ quality score\n- Target 75%+ confidence' :
  context.marketRegime === 'volatile' ?
  '- Risk management paramount\n- Clear directional bias needed\n- Require 65+ quality score\n- Target 70%+ confidence' :
  '- Breakout confirmation essential\n- Momentum expansion required\n- Require 70+ quality score\n- Target 75%+ confidence'
}

FINAL VALIDATION CHECKLIST:
1. Does the signal align with current market regime?
2. Are risk-reward ratios adequate for volatility level?
3. Is timing appropriate for current session?
4. Are there any correlation or news conflicts?
5. Does the signal meet minimum quality thresholds?

Provide final validation in JSON format:
{
  "approved": boolean,
  "finalConfidence": number (0-100),
  "finalQualityScore": number (0-100),
  "adjustedStopLoss": number (if different),
  "adjustedTakeProfits": [array if different],
  "validationNotes": "detailed reasoning for approval/rejection",
  "riskAssessment": "LOW" | "MEDIUM" | "HIGH",
  "expectedOutcome": "probability assessment"
}

CRITICAL: Only approve signals that meet the regime-specific criteria and show clear edge in current market conditions.`;
};

// Progressive take profit spacing based on ATR and volatility
export const calculateProgressiveTakeProfits = (
  entryPrice: number,
  stopLoss: number,
  signalType: 'BUY' | 'SELL',
  atr: number,
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme',
  marketRegime: 'trending' | 'ranging' | 'volatile' | 'breakout'
): number[] => {
  const stopDistance = Math.abs(entryPrice - stopLoss);
  
  // Base ratios adjusted for regime and volatility
  let ratios: number[];
  
  if (marketRegime === 'trending') {
    ratios = volatilityProfile === 'extreme' ? [2.5, 4.0, 6.0, 8.0] :
             volatilityProfile === 'high' ? [2.5, 4.5, 7.0, 10.0] :
             volatilityProfile === 'normal' ? [2.5, 4.8, 8.0, 12.0] :
             [2.5, 5.0, 9.0, 15.0];
  } else if (marketRegime === 'ranging') {
    ratios = volatilityProfile === 'extreme' ? [2.0, 3.0, 4.0] :
             volatilityProfile === 'high' ? [2.5, 3.5, 5.0] :
             volatilityProfile === 'normal' ? [2.5, 4.0, 6.0] :
             [3.0, 4.5, 7.0];
  } else if (marketRegime === 'breakout') {
    ratios = volatilityProfile === 'extreme' ? [2.5, 4.0, 6.5] :
             volatilityProfile === 'high' ? [2.5, 4.5, 7.5] :
             volatilityProfile === 'normal' ? [2.5, 5.0, 8.5] :
             [3.0, 5.5, 10.0];
  } else { // volatile
    ratios = [2.5, 3.5, 5.0];
  }
  
  // Progressive spacing with ATR influence
  const atrMultiplier = atr / entryPrice;
  const progressiveMultiplier = 1 + (atrMultiplier * 100); // Scale ATR influence
  
  return ratios.map((ratio, index) => {
    const adjustedRatio = ratio * (1 + (index * 0.1 * progressiveMultiplier));
    const targetDistance = stopDistance * adjustedRatio;
    return signalType === 'BUY' ? 
      entryPrice + targetDistance : 
      entryPrice - targetDistance;
  });
};

// Dynamic stop loss calculation with support/resistance awareness
export const calculateDynamicStopLoss = (
  entryPrice: number,
  signalType: 'BUY' | 'SELL',
  atr: number,
  supportResistance: { supports: number[]; resistances: number[] },
  volatilityProfile: 'low' | 'normal' | 'high' | 'extreme'
): number => {
  // Base ATR multiplier
  let atrMultiplier = 2.5;
  
  switch (volatilityProfile) {
    case 'low': atrMultiplier = 2.0; break;
    case 'normal': atrMultiplier = 2.5; break;
    case 'high': atrMultiplier = 3.0; break;
    case 'extreme': atrMultiplier = 3.5; break;
  }
  
  const baseStopDistance = atr * atrMultiplier;
  let stopPrice = signalType === 'BUY' ? 
    entryPrice - baseStopDistance : 
    entryPrice + baseStopDistance;
  
  // Adjust for nearby support/resistance levels
  if (signalType === 'BUY' && supportResistance.supports.length > 0) {
    const nearestSupport = supportResistance.supports[0];
    const supportDistance = entryPrice - nearestSupport;
    
    // If support is very close, place stop just below it
    if (supportDistance > 0 && supportDistance < baseStopDistance * 1.5) {
      const pipSize = entryPrice.toString().includes('JPY') ? 0.01 : 0.0001;
      stopPrice = nearestSupport - (5 * pipSize); // 5 pips below support
    }
  } else if (signalType === 'SELL' && supportResistance.resistances.length > 0) {
    const nearestResistance = supportResistance.resistances[0];
    const resistanceDistance = nearestResistance - entryPrice;
    
    // If resistance is very close, place stop just above it
    if (resistanceDistance > 0 && resistanceDistance < baseStopDistance * 1.5) {
      const pipSize = entryPrice.toString().includes('JPY') ? 0.01 : 0.0001;
      stopPrice = nearestResistance + (5 * pipSize); // 5 pips above resistance
    }
  }
  
  // Ensure minimum distance (increased from original)
  const pipSize = entryPrice.toString().includes('JPY') ? 0.01 : 0.0001;
  const minimumDistance = 25 * pipSize; // Minimum 25 pips
  const currentDistance = Math.abs(entryPrice - stopPrice);
  
  if (currentDistance < minimumDistance) {
    stopPrice = signalType === 'BUY' ? 
      entryPrice - minimumDistance : 
      entryPrice + minimumDistance;
  }
  
  return stopPrice;
};