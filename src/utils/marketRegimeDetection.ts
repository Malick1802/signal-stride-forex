
// Market Regime Detection and Session Analysis
export interface MarketSession {
  name: string;
  isActive: boolean;
  volatilityLevel: 'low' | 'normal' | 'high';
  tradingRecommendation: 'avoid' | 'caution' | 'normal' | 'favorable';
  majorPairs: string[];
}

export interface MarketRegime {
  type: 'trending' | 'ranging' | 'volatile' | 'consolidating';
  strength: number; // 0-1
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  duration: number; // hours
  characteristics: string[];
}

export interface SessionOptimization {
  bestPairs: string[];
  avoidPairs: string[];
  volatilityForecast: 'increasing' | 'decreasing' | 'stable';
  recommendedStrategies: string[];
}

// Get current market session with enhanced analysis
export const getCurrentMarketSession = (): MarketSession => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  
  // Enhanced session definitions with volatility characteristics
  if (utcHour >= 0 && utcHour < 8) {
    // Asian Session (Sydney/Tokyo)
    return {
      name: 'Asian Session',
      isActive: true,
      volatilityLevel: utcDay >= 1 && utcDay <= 5 ? 'normal' : 'low',
      tradingRecommendation: 'caution',
      majorPairs: ['USDJPY', 'AUDUSD', 'NZDUSD', 'EURJPY', 'GBPJPY']
    };
  } else if (utcHour >= 8 && utcHour < 16) {
    // European Session (London)
    return {
      name: 'European Session',
      isActive: true,
      volatilityLevel: 'high',
      tradingRecommendation: 'favorable',
      majorPairs: ['EURUSD', 'GBPUSD', 'USDCHF', 'EURGBP', 'EURJPY']
    };
  } else if (utcHour >= 13 && utcHour < 17) {
    // London-New York Overlap
    return {
      name: 'London-NY Overlap',
      isActive: true,
      volatilityLevel: 'high',
      tradingRecommendation: 'favorable',
      majorPairs: ['EURUSD', 'GBPUSD', 'USDCHF', 'USDJPY', 'USDCAD']
    };
  } else if (utcHour >= 17 && utcHour < 22) {
    // US Session (New York)
    return {
      name: 'US Session',
      isActive: true,
      volatilityLevel: 'normal',
      tradingRecommendation: 'normal',
      majorPairs: ['EURUSD', 'GBPUSD', 'USDCAD', 'USDJPY']
    };
  } else {
    // Low activity period
    return {
      name: 'Low Activity',
      isActive: false,
      volatilityLevel: 'low',
      tradingRecommendation: 'avoid',
      majorPairs: []
    };
  }
};

// Detect market regime using multiple indicators
export const detectMarketRegime = (
  priceData: Array<{ timestamp: number; price: number }>,
  atr: number,
  currentPrice: number
): MarketRegime => {
  if (priceData.length < 50) {
    return {
      type: 'consolidating',
      strength: 0.5,
      direction: 'neutral',
      confidence: 30,
      duration: 0,
      characteristics: ['Insufficient data']
    };
  }
  
  const prices = priceData.map(d => d.price);
  const timestamps = priceData.map(d => d.timestamp);
  
  // 1. Trend Analysis using Linear Regression
  const n = prices.length;
  const sumX = timestamps.reduce((sum, time, i) => sum + i, 0);
  const sumY = prices.reduce((sum, price) => sum + price, 0);
  const sumXY = timestamps.reduce((sum, time, i) => sum + (i * prices[i]), 0);
  const sumX2 = timestamps.reduce((sum, time, i) => sum + (i * i), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const slopeStrength = Math.abs(slope) / currentPrice;
  
  // 2. Volatility Analysis
  const volatilityRatio = atr / currentPrice;
  
  // 3. Range Analysis
  const recentPrices = prices.slice(-20);
  const highestHigh = Math.max(...recentPrices);
  const lowestLow = Math.min(...recentPrices);
  const priceRange = highestHigh - lowestLow;
  const rangeRatio = priceRange / currentPrice;
  
  // 4. Price Position Analysis
  const pricePosition = (currentPrice - lowestLow) / priceRange;
  
  // Determine regime type
  let regimeType: 'trending' | 'ranging' | 'volatile' | 'consolidating';
  let strength = 0;
  let direction: 'bullish' | 'bearish' | 'neutral';
  const characteristics: string[] = [];
  
  // Trending market detection
  if (slopeStrength > 0.002 && volatilityRatio < 0.02) {
    regimeType = 'trending';
    strength = Math.min(slopeStrength * 500, 1);
    direction = slope > 0 ? 'bullish' : 'bearish';
    characteristics.push('Clear trend direction', 'Low to moderate volatility');
  }
  // Volatile market detection
  else if (volatilityRatio > 0.03 || rangeRatio > 0.05) {
    regimeType = 'volatile';
    strength = Math.min(volatilityRatio * 33, 1);
    direction = pricePosition > 0.6 ? 'bullish' : pricePosition < 0.4 ? 'bearish' : 'neutral';
    characteristics.push('High volatility', 'Wide price swings');
  }
  // Ranging market detection
  else if (rangeRatio > 0.015 && slopeStrength < 0.001) {
    regimeType = 'ranging';
    strength = Math.min(rangeRatio * 67, 1);
    direction = 'neutral';
    characteristics.push('Sideways movement', 'Support/Resistance levels active');
  }
  // Consolidating market
  else {
    regimeType = 'consolidating';
    strength = 0.3;
    direction = 'neutral';
    characteristics.push('Low volatility', 'Narrow range');
  }
  
  // Calculate confidence based on data quality and regime clarity
  let confidence = 50;
  
  if (n >= 100) confidence += 20; // More data = higher confidence
  if (strength > 0.7) confidence += 20; // Clear regime = higher confidence
  if (volatilityRatio < 0.01) confidence -= 10; // Very low volatility = less reliable
  if (volatilityRatio > 0.04) confidence -= 15; // Extreme volatility = less reliable
  
  confidence = Math.max(30, Math.min(95, confidence));
  
  // Estimate regime duration (simplified)
  const duration = Math.floor(n / 4); // Rough estimate based on data points
  
  return {
    type: regimeType,
    strength,
    direction,
    confidence,
    duration,
    characteristics
  };
};

// Session-based trading optimization
export const optimizeForSession = (
  currentSession: MarketSession,
  marketRegime: MarketRegime,
  availablePairs: string[]
): SessionOptimization => {
  const bestPairs: string[] = [];
  const avoidPairs: string[] = [];
  const recommendedStrategies: string[] = [];
  
  // Session-specific pair selection
  if (currentSession.tradingRecommendation === 'favorable') {
    bestPairs.push(...currentSession.majorPairs.filter(pair => availablePairs.includes(pair)));
  }
  
  // Regime-specific strategies
  switch (marketRegime.type) {
    case 'trending':
      recommendedStrategies.push('Trend following', 'Momentum strategies');
      if (marketRegime.strength > 0.7) {
        recommendedStrategies.push('Breakout strategies');
      }
      break;
      
    case 'ranging':
      recommendedStrategies.push('Mean reversion', 'Support/Resistance trading');
      // Avoid trend-following strategies in ranging markets
      break;
      
    case 'volatile':
      recommendedStrategies.push('Scalping', 'News trading');
      // Increase stop losses in volatile conditions
      break;
      
    case 'consolidating':
      recommendedStrategies.push('Patience', 'Wait for breakout');
      // Avoid most trading in consolidating markets
      avoidPairs.push(...availablePairs.filter(pair => !bestPairs.includes(pair)));
      break;
  }
  
  // Session-specific adjustments
  if (currentSession.volatilityLevel === 'low') {
    avoidPairs.push(...availablePairs.filter(pair => 
      !currentSession.majorPairs.includes(pair)
    ));
  }
  
  // Volatility forecast (simplified)
  let volatilityForecast: 'increasing' | 'decreasing' | 'stable' = 'stable';
  
  if (currentSession.name === 'European Session' || currentSession.name === 'London-NY Overlap') {
    volatilityForecast = 'increasing';
  } else if (currentSession.name === 'Low Activity') {
    volatilityForecast = 'decreasing';
  }
  
  return {
    bestPairs: bestPairs.slice(0, 8), // Limit to top 8 pairs
    avoidPairs,
    volatilityForecast,
    recommendedStrategies
  };
};

// Time-based entry optimization
export const getOptimalEntryTimes = (pair: string): { 
  recommended: boolean; 
  reason: string; 
  nextOptimalTime?: Date 
} => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  
  // Major news release times to avoid (simplified)
  const newsHours = [8, 9, 12, 13, 14, 15]; // Major economic release times
  
  if (newsHours.includes(utcHour) && utcMinute >= 25 && utcMinute <= 35) {
    const nextHour = new Date(now);
    nextHour.setUTCHours(utcHour + 1, 0, 0, 0);
    
    return {
      recommended: false,
      reason: 'Major news release window - high volatility risk',
      nextOptimalTime: nextHour
    };
  }
  
  // Session transition periods (higher volatility)
  if ((utcHour === 7 || utcHour === 8) || (utcHour === 16 || utcHour === 17)) {
    return {
      recommended: true,
      reason: 'Session transition - good volatility for entries'
    };
  }
  
  // Low activity periods
  if (utcHour >= 22 || utcHour <= 1) {
    const nextMorning = new Date(now);
    nextMorning.setUTCHours(8, 0, 0, 0);
    if (nextMorning <= now) {
      nextMorning.setUTCDate(nextMorning.getUTCDate() + 1);
    }
    
    return {
      recommended: false,
      reason: 'Low market activity - reduced volatility and liquidity',
      nextOptimalTime: nextMorning
    };
  }
  
  return {
    recommended: true,
    reason: 'Normal trading conditions'
  };
};

// Comprehensive market analysis
export const analyzeMarketConditions = (
  priceData: Array<{ timestamp: number; price: number }>,
  atr: number,
  currentPrice: number,
  availablePairs: string[]
): {
  session: MarketSession;
  regime: MarketRegime;
  optimization: SessionOptimization;
  tradingRecommendation: {
    shouldTrade: boolean;
    confidence: number;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  };
} => {
  const session = getCurrentMarketSession();
  const regime = detectMarketRegime(priceData, atr, currentPrice);
  const optimization = optimizeForSession(session, regime, availablePairs);
  
  // Overall trading recommendation
  let shouldTrade = false;
  let confidence = 0;
  const reasons: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
  
  // Session analysis
  if (session.tradingRecommendation === 'favorable') {
    shouldTrade = true;
    confidence += 30;
    reasons.push(`Favorable ${session.name} conditions`);
  } else if (session.tradingRecommendation === 'normal') {
    shouldTrade = true;
    confidence += 20;
    reasons.push(`Normal ${session.name} conditions`);
  } else if (session.tradingRecommendation === 'avoid') {
    shouldTrade = false;
    reasons.push(`${session.name} - low activity period`);
  }
  
  // Regime analysis
  if (regime.confidence > 70) {
    confidence += 25;
    reasons.push(`Clear ${regime.type} market regime (${regime.confidence}% confidence)`);
  } else if (regime.confidence > 50) {
    confidence += 15;
    reasons.push(`Moderate ${regime.type} market regime`);
  } else {
    confidence -= 10;
    reasons.push('Unclear market regime');
  }
  
  // Risk level assessment
  if (session.volatilityLevel === 'high' && regime.type === 'volatile') {
    riskLevel = 'extreme';
    confidence -= 20;
    reasons.push('Extreme volatility conditions');
  } else if (session.volatilityLevel === 'high' || regime.type === 'volatile') {
    riskLevel = 'high';
    confidence -= 10;
    reasons.push('High volatility conditions');
  } else if (session.volatilityLevel === 'low' && regime.type === 'consolidating') {
    riskLevel = 'low';
    confidence -= 5;
    reasons.push('Low volatility - limited opportunity');
  }
  
  // Final adjustments
  confidence = Math.max(0, Math.min(100, confidence));
  
  if (confidence < 40) {
    shouldTrade = false;
  }
  
  return {
    session,
    regime,
    optimization,
    tradingRecommendation: {
      shouldTrade,
      confidence,
      reasons,
      riskLevel
    }
  };
};
