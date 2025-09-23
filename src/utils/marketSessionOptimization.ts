// Phase 2: Market Session-Specific Optimization
export interface SessionAnalysis {
  session: 'Asian' | 'London' | 'NY' | 'Overlap';
  isOptimal: boolean;
  volatilityMultiplier: number;
  preferredPairs: string[];
  bonusScore: number;
}

export interface MarketRegimeAnalysis {
  regime: 'trending' | 'ranging' | 'volatile' | 'breakout';
  strength: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// Current market session detection with enhanced timezone logic
export const getCurrentMarketSession = (): SessionAnalysis => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const timeInMinutes = utcHours * 60 + utcMinutes;

  // Session times in UTC minutes
  const sessions = {
    asian: { start: 23 * 60, end: 8 * 60 }, // 23:00-08:00 UTC
    london: { start: 7 * 60, end: 16 * 60 }, // 07:00-16:00 UTC
    ny: { start: 12 * 60, end: 21 * 60 }, // 12:00-21:00 UTC
  };

  // Check for overlaps (highest priority)
  if (timeInMinutes >= sessions.london.start && timeInMinutes <= sessions.ny.end && 
      timeInMinutes >= sessions.ny.start) {
    return {
      session: 'Overlap',
      isOptimal: true,
      volatilityMultiplier: 1.5,
      preferredPairs: ['EURUSD', 'GBPUSD', 'USDCHF', 'EURGBP'],
      bonusScore: 15
    };
  }

  // London session
  if (timeInMinutes >= sessions.london.start && timeInMinutes <= sessions.london.end) {
    return {
      session: 'London',
      isOptimal: true,
      volatilityMultiplier: 1.3,
      preferredPairs: ['EURUSD', 'GBPUSD', 'EURGBP', 'EURJPY'],
      bonusScore: 10
    };
  }

  // NY session
  if (timeInMinutes >= sessions.ny.start && timeInMinutes <= sessions.ny.end) {
    return {
      session: 'NY',
      isOptimal: true,
      volatilityMultiplier: 1.2,
      preferredPairs: ['EURUSD', 'GBPUSD', 'USDCAD', 'USDJPY'],
      bonusScore: 8
    };
  }

  // Asian session (lower volatility)
  return {
    session: 'Asian',
    isOptimal: false,
    volatilityMultiplier: 0.8,
    preferredPairs: ['USDJPY', 'AUDUSD', 'NZDUSD', 'EURJPY'],
    bonusScore: 0
  };
};

// Dynamic RSI thresholds based on market volatility
export const getDynamicRSIThresholds = (atr: number, currentPrice: number, session: SessionAnalysis): { oversold: number; overbought: number; bonusMultiplier: number } => {
  const volatilityRatio = atr / currentPrice;
  
  let oversold = 30;
  let overbought = 70;
  let bonusMultiplier = 1.0;

  // Adjust based on volatility
  if (volatilityRatio > 0.02) { // High volatility
    oversold = 25;
    overbought = 75;
    bonusMultiplier = 1.2;
  } else if (volatilityRatio > 0.015) { // Medium volatility
    oversold = 28;
    overbought = 72;
    bonusMultiplier = 1.1;
  } else if (volatilityRatio < 0.005) { // Low volatility
    oversold = 35;
    overbought = 65;
    bonusMultiplier = 0.9;
  }

  // Session-specific adjustments
  if (session.session === 'Overlap') {
    oversold -= 5;
    overbought += 5;
    bonusMultiplier *= 1.2;
  } else if (session.session === 'Asian') {
    oversold += 5;
    overbought -= 5;
    bonusMultiplier *= 0.8;
  }

  return { oversold, overbought, bonusMultiplier };
};

// Market regime detection with enhanced logic
export const detectMarketRegime = (priceData: number[], atr: number, currentPrice: number): MarketRegimeAnalysis => {
  if (priceData.length < 20) {
    return { regime: 'ranging', strength: 0.5, direction: 'neutral', confidence: 0.3 };
  }

  const recentPrices = priceData.slice(-20);
  const shortTermPrices = priceData.slice(-10);
  
  // Calculate trend strength using linear regression
  const n = recentPrices.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = recentPrices.reduce((sum, price) => sum + price, 0);
  const sumXY = recentPrices.reduce((sum, price, i) => sum + (i * price), 0);
  const sumX2 = recentPrices.reduce((sum, _, i) => sum + (i * i), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const slopeStrength = Math.abs(slope) / currentPrice;
  
  // Volatility assessment
  const volatilityRatio = atr / currentPrice;
  
  // Price range analysis
  const highestHigh = Math.max(...recentPrices);
  const lowestLow = Math.min(...recentPrices);
  const priceRange = (highestHigh - lowestLow) / currentPrice;
  
  // Determine regime
  let regime: 'trending' | 'ranging' | 'volatile' | 'breakout';
  let strength: number;
  let direction: 'bullish' | 'bearish' | 'neutral';
  let confidence: number;

  if (volatilityRatio > 0.025) {
    regime = 'volatile';
    strength = volatilityRatio * 10;
    direction = slope > 0 ? 'bullish' : slope < 0 ? 'bearish' : 'neutral';
    confidence = Math.min(0.9, volatilityRatio * 20);
  } else if (slopeStrength > 0.002 && priceRange > 0.015) {
    regime = 'trending';
    strength = slopeStrength * 100;
    direction = slope > 0 ? 'bullish' : 'bearish';
    confidence = Math.min(0.95, slopeStrength * 200);
  } else if (priceRange > 0.02 && Math.abs(recentPrices[0] - recentPrices[recentPrices.length - 1]) / currentPrice > 0.01) {
    regime = 'breakout';
    strength = priceRange * 10;
    direction = shortTermPrices[0] > shortTermPrices[shortTermPrices.length - 1] ? 'bullish' : 'bearish';
    confidence = Math.min(0.85, priceRange * 15);
  } else {
    regime = 'ranging';
    strength = 1 - slopeStrength * 100;
    direction = 'neutral';
    confidence = Math.max(0.4, 1 - priceRange * 10);
  }

  return { regime, strength, direction, confidence };
};

// Support and resistance level detection
export const detectSupportResistanceLevels = (priceData: number[], currentPrice: number): { supports: number[]; resistances: number[]; strength: number } => {
  if (priceData.length < 50) {
    return { supports: [], resistances: [], strength: 0 };
  }

  const recentPrices = priceData.slice(-50);
  const highs: number[] = [];
  const lows: number[] = [];
  
  // Find local highs and lows
  for (let i = 2; i < recentPrices.length - 2; i++) {
    const price = recentPrices[i];
    
    // Local high
    if (price > recentPrices[i-1] && price > recentPrices[i-2] && 
        price > recentPrices[i+1] && price > recentPrices[i+2]) {
      highs.push(price);
    }
    
    // Local low
    if (price < recentPrices[i-1] && price < recentPrices[i-2] && 
        price < recentPrices[i+1] && price < recentPrices[i+2]) {
      lows.push(price);
    }
  }

  // Filter levels by proximity and significance
  const resistances = highs
    .filter(level => level > currentPrice)
    .filter((level, index, arr) => 
      arr.filter(other => Math.abs(other - level) / currentPrice < 0.002).length >= 1
    )
    .slice(0, 3)
    .sort((a, b) => a - b);

  const supports = lows
    .filter(level => level < currentPrice)
    .filter((level, index, arr) => 
      arr.filter(other => Math.abs(other - level) / currentPrice < 0.002).length >= 1
    )
    .slice(0, 3)
    .sort((a, b) => b - a);

  const strength = (supports.length + resistances.length) / 6;

  return { supports, resistances, strength };
};

// Economic calendar integration awareness
export const checkEconomicCalendarImpact = async (symbol: string, supabase: any): Promise<{ hasNearbyEvents: boolean; avoidSignal: boolean; impactLevel: string }> => {
  const now = new Date();
  const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourAfter = new Date(now.getTime() + 60 * 60 * 1000);

  try {
    const currencies = symbol.includes('USD') ? ['USD'] : [];
    if (symbol.includes('EUR')) currencies.push('EUR');
    if (symbol.includes('GBP')) currencies.push('GBP');
    if (symbol.includes('JPY')) currencies.push('JPY');
    if (symbol.includes('CHF')) currencies.push('CHF');
    if (symbol.includes('AUD')) currencies.push('AUD');
    if (symbol.includes('CAD')) currencies.push('CAD');
    if (symbol.includes('NZD')) currencies.push('NZD');

    const { data: events } = await supabase
      .from('economic_calendar_events')
      .select('impact_level, event_time, currency')
      .in('currency', currencies)
      .gte('event_time', oneHourBefore.toISOString())
      .lte('event_time', oneHourAfter.toISOString());

    if (!events || events.length === 0) {
      return { hasNearbyEvents: false, avoidSignal: false, impactLevel: 'none' };
    }

    const highImpactEvents = events.filter(e => e.impact_level === 'high');
    const mediumImpactEvents = events.filter(e => e.impact_level === 'medium');

    if (highImpactEvents.length > 0) {
      return { hasNearbyEvents: true, avoidSignal: true, impactLevel: 'high' };
    }

    if (mediumImpactEvents.length > 1) {
      return { hasNearbyEvents: true, avoidSignal: true, impactLevel: 'medium' };
    }

    return { 
      hasNearbyEvents: events.length > 0, 
      avoidSignal: false, 
      impactLevel: events.length > 0 ? 'low' : 'none' 
    };
  } catch (error) {
    console.warn('Economic calendar check failed:', error);
    return { hasNearbyEvents: false, avoidSignal: false, impactLevel: 'unknown' };
  }
};

// Enhanced confluence scoring with session and regime bonuses
export const calculateEnhancedConfluenceScore = (
  rsi: number,
  macdStrength: number,
  trendAlignment: boolean,
  supportResistance: { supports: number[]; resistances: number[]; strength: number },
  session: SessionAnalysis,
  regime: MarketRegimeAnalysis,
  signalType: 'BUY' | 'SELL',
  currentPrice: number,
  economicImpact: { hasNearbyEvents: boolean; avoidSignal: boolean; impactLevel: string }
): { score: number; factors: string[]; sessionBonus: number; regimeBonus: number } => {
  let score = 0;
  const factors: string[] = [];
  
  // Base technical confluences
  const rsiThresholds = getDynamicRSIThresholds(0.001, currentPrice, session);
  
  if (signalType === 'BUY') {
    if (rsi < rsiThresholds.oversold) {
      score += 20 * rsiThresholds.bonusMultiplier;
      factors.push(`RSI oversold (${rsi.toFixed(1)})`);
    }
  } else {
    if (rsi > rsiThresholds.overbought) {
      score += 20 * rsiThresholds.bonusMultiplier;
      factors.push(`RSI overbought (${rsi.toFixed(1)})`);
    }
  }

  if (macdStrength > 0.00001) {
    score += 15;
    factors.push('Strong MACD momentum');
  }

  if (trendAlignment) {
    score += 20;
    factors.push('Trend alignment confirmed');
  }

  // Support/Resistance confluence
  if (signalType === 'BUY' && supportResistance.supports.length > 0) {
    const nearestSupport = supportResistance.supports[0];
    const distance = Math.abs(currentPrice - nearestSupport) / currentPrice;
    if (distance < 0.005) {
      score += 15 * supportResistance.strength;
      factors.push('Near key support level');
    }
  } else if (signalType === 'SELL' && supportResistance.resistances.length > 0) {
    const nearestResistance = supportResistance.resistances[0];
    const distance = Math.abs(currentPrice - nearestResistance) / currentPrice;
    if (distance < 0.005) {
      score += 15 * supportResistance.strength;
      factors.push('Near key resistance level');
    }
  }

  // Session bonus
  let sessionBonus = 0;
  if (session.isOptimal) {
    sessionBonus = session.bonusScore;
    score += sessionBonus;
    factors.push(`Optimal ${session.session} session`);
  }

  // Market regime bonus
  let regimeBonus = 0;
  if (regime.regime === 'trending' && regime.confidence > 0.7) {
    regimeBonus = 10;
    score += regimeBonus;
    factors.push(`Strong ${regime.direction} trend detected`);
  } else if (regime.regime === 'breakout' && regime.confidence > 0.6) {
    regimeBonus = 8;
    score += regimeBonus;
    factors.push(`Breakout pattern detected`);
  }

  // Economic calendar penalty
  if (economicImpact.avoidSignal) {
    score -= 25;
    factors.push(`High-impact ${economicImpact.impactLevel} news nearby`);
  } else if (economicImpact.hasNearbyEvents) {
    score -= 10;
    factors.push(`Economic events nearby`);
  }

  return { score, factors, sessionBonus, regimeBonus };
};