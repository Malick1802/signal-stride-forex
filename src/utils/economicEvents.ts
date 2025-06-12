
// Economic events and news analysis for forex signals
export interface EconomicEvent {
  title: string;
  currency: string;
  impact: 'High' | 'Medium' | 'Low';
  time: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  relevance: number;
}

export interface MarketSentiment {
  score: number; // -1 to 1
  label: 'Positive' | 'Neutral' | 'Negative';
  confidence: number;
  factors: string[];
}

// Get relevant economic events for a currency pair
export const getRelevantEconomicEvents = (pair: string): EconomicEvent[] => {
  const baseCurrency = pair.substring(0, 3);
  const quoteCurrency = pair.substring(3, 6);
  
  // Simulated economic events based on current market conditions
  const events: EconomicEvent[] = [];
  
  // USD events
  if (baseCurrency === 'USD' || quoteCurrency === 'USD') {
    events.push({
      title: 'Federal Reserve Interest Rate Decision',
      currency: 'USD',
      impact: 'High',
      time: 'This Week',
      forecast: '5.25-5.50%',
      previous: '5.25-5.50%',
      relevance: 0.9
    });
    
    events.push({
      title: 'Non-Farm Payrolls',
      currency: 'USD',
      impact: 'High',
      time: 'Next Week',
      forecast: '200K',
      previous: '227K',
      relevance: 0.8
    });
  }
  
  // EUR events
  if (baseCurrency === 'EUR' || quoteCurrency === 'EUR') {
    events.push({
      title: 'ECB Interest Rate Decision',
      currency: 'EUR',
      impact: 'High',
      time: 'This Week',
      forecast: '4.50%',
      previous: '4.50%',
      relevance: 0.85
    });
    
    events.push({
      title: 'Eurozone CPI Flash Estimate',
      currency: 'EUR',
      impact: 'Medium',
      time: 'Today',
      forecast: '2.4%',
      previous: '2.4%',
      relevance: 0.7
    });
  }
  
  // GBP events
  if (baseCurrency === 'GBP' || quoteCurrency === 'GBP') {
    events.push({
      title: 'Bank of England Rate Decision',
      currency: 'GBP',
      impact: 'High',
      time: 'Next Week',
      forecast: '5.25%',
      previous: '5.25%',
      relevance: 0.85
    });
  }
  
  // JPY events
  if (baseCurrency === 'JPY' || quoteCurrency === 'JPY') {
    events.push({
      title: 'Bank of Japan Policy Meeting',
      currency: 'JPY',
      impact: 'High',
      time: 'This Week',
      forecast: 'Unchanged',
      previous: '-0.10%',
      relevance: 0.8
    });
  }
  
  return events.filter(event => event.relevance > 0.5);
};

// Calculate market sentiment for a currency pair
export const calculateMarketSentiment = (pair: string, technicalScore: number, economicEvents: EconomicEvent[]): MarketSentiment => {
  let sentimentScore = 0;
  const factors: string[] = [];
  
  // Technical sentiment (40% weight)
  const technicalSentiment = (technicalScore - 5) / 5; // Normalize to -1 to 1
  sentimentScore += technicalSentiment * 0.4;
  factors.push(`Technical analysis: ${technicalScore}/10`);
  
  // Economic events sentiment (40% weight)
  const highImpactEvents = economicEvents.filter(e => e.impact === 'High');
  const economicSentiment = highImpactEvents.length > 0 ? 0.2 : 0;
  sentimentScore += economicSentiment * 0.4;
  if (highImpactEvents.length > 0) {
    factors.push(`${highImpactEvents.length} high-impact events pending`);
  }
  
  // Market session sentiment (20% weight)
  const hour = new Date().getUTCHours();
  let sessionSentiment = 0;
  if (hour >= 8 && hour < 16) {
    sessionSentiment = 0.1; // European session
    factors.push('Active European trading session');
  } else if (hour >= 13 && hour < 21) {
    sessionSentiment = 0.15; // US session overlap
    factors.push('US-European session overlap');
  }
  sentimentScore += sessionSentiment * 0.2;
  
  // Normalize sentiment score
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
  
  let label: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
  if (sentimentScore > 0.2) label = 'Positive';
  else if (sentimentScore < -0.2) label = 'Negative';
  
  return {
    score: sentimentScore,
    label,
    confidence: Math.abs(sentimentScore) * 100,
    factors
  };
};

// Get relevant news headlines (simulated)
export const getRelevantNewsHeadlines = (pair: string): string[] => {
  const headlines: string[] = [];
  
  if (pair.includes('USD')) {
    headlines.push('Fed officials signal cautious approach to rate cuts');
    headlines.push('US inflation expectations remain anchored');
  }
  
  if (pair.includes('EUR')) {
    headlines.push('ECB maintains restrictive monetary policy stance');
    headlines.push('Eurozone economic growth shows signs of stabilization');
  }
  
  if (pair.includes('GBP')) {
    headlines.push('Bank of England holds rates amid inflation concerns');
    headlines.push('UK service sector PMI beats expectations');
  }
  
  if (pair.includes('JPY')) {
    headlines.push('Bank of Japan maintains ultra-loose monetary policy');
    headlines.push('Yen intervention risks rise as volatility increases');
  }
  
  return headlines.slice(0, 3); // Return top 3 relevant headlines
};
