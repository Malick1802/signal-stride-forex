
export interface SentimentData {
  score: number; // -1 to 1
  label: 'Positive' | 'Neutral' | 'Negative';
  retail_long_percentage?: number;
  retail_short_percentage?: number;
  institutional_bias?: string;
  news_sentiment?: number;
}

export class SentimentAnalysis {
  // Calculate sentiment from various factors
  static calculateCompositeSentiment(
    technicalBias: number, // -1 to 1
    newsSentiment: number = 0, // -1 to 1
    retailSentiment: number = 0, // -1 to 1
    economicEventImpact: number = 0 // -1 to 1
  ): SentimentData {
    
    // Weighted composite sentiment
    const weights = {
      technical: 0.4,
      news: 0.25,
      retail: 0.15,
      economic: 0.2
    };
    
    const compositeScore = (
      technicalBias * weights.technical +
      newsSentiment * weights.news +
      retailSentiment * weights.retail +
      economicEventImpact * weights.economic
    );
    
    // Normalize to -1 to 1 range
    const normalizedScore = Math.max(-1, Math.min(1, compositeScore));
    
    let label: 'Positive' | 'Neutral' | 'Negative';
    if (normalizedScore > 0.2) {
      label = 'Positive';
    } else if (normalizedScore < -0.2) {
      label = 'Negative';
    } else {
      label = 'Neutral';
    }
    
    return {
      score: normalizedScore,
      label,
      news_sentiment: newsSentiment
    };
  }

  // Generate technical sentiment from indicators
  static getTechnicalSentiment(indicators: any): number {
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalSignals = 0;
    
    // RSI analysis
    if (indicators.rsi_14) {
      totalSignals++;
      if (indicators.rsi_14 > 70) bearishSignals++; // Overbought
      else if (indicators.rsi_14 < 30) bullishSignals++; // Oversold
      else if (indicators.rsi_14 > 50) bullishSignals += 0.5;
      else bearishSignals += 0.5;
    }
    
    // MACD analysis
    if (indicators.macd_histogram !== undefined) {
      totalSignals++;
      if (indicators.macd_histogram > 0) bullishSignals++;
      else bearishSignals++;
    }
    
    // EMA trend analysis
    if (indicators.ema_50 && indicators.ema_200) {
      totalSignals++;
      if (indicators.ema_50 > indicators.ema_200) bullishSignals++;
      else bearishSignals++;
    }
    
    // Bollinger Bands analysis
    if (indicators.bb_upper && indicators.bb_lower && indicators.current_price) {
      totalSignals++;
      const bbPosition = (indicators.current_price - indicators.bb_lower) / 
                        (indicators.bb_upper - indicators.bb_lower);
      
      if (bbPosition > 0.8) bearishSignals++; // Near upper band
      else if (bbPosition < 0.2) bullishSignals++; // Near lower band
      else if (bbPosition > 0.5) bullishSignals += 0.5;
      else bearishSignals += 0.5;
    }
    
    if (totalSignals === 0) return 0;
    
    const netSentiment = (bullishSignals - bearishSignals) / totalSignals;
    return Math.max(-1, Math.min(1, netSentiment));
  }

  // Simulate retail sentiment (in real implementation, this would come from broker data)
  static generateRetailSentiment(pair: string, technicalBias: number): {
    retail_long_percentage: number;
    retail_short_percentage: number;
    sentiment_score: number;
  } {
    // Simulate contrarian retail behavior (retail usually goes against the trend)
    const contrarian_factor = -0.3;
    const random_factor = (Math.random() - 0.5) * 0.4;
    
    const retail_bias = (technicalBias * contrarian_factor) + random_factor;
    
    // Convert to percentage (50% base + bias)
    const long_percentage = Math.max(20, Math.min(80, 50 + (retail_bias * 30)));
    const short_percentage = 100 - long_percentage;
    
    return {
      retail_long_percentage: Math.round(long_percentage),
      retail_short_percentage: Math.round(short_percentage),
      sentiment_score: retail_bias
    };
  }

  // Analyze economic event impact
  static getEconomicImpact(events: any[], pair: string): {
    impact_score: number;
    impact_description: string;
  } {
    if (!events || events.length === 0) {
      return { impact_score: 0, impact_description: 'No major economic events' };
    }
    
    const relevantCurrencies = pair.slice(0, 3) + pair.slice(3, 6);
    const now = new Date();
    const nextHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    let totalImpact = 0;
    let highImpactEvents = 0;
    const eventDescriptions: string[] = [];
    
    events.forEach(event => {
      const eventTime = new Date(event.event_time);
      
      // Check if event is relevant to our currency pair and within next 24 hours
      if (relevantCurrencies.includes(event.currency) && 
          eventTime >= now && eventTime <= nextHours) {
        
        let impact = 0;
        switch (event.impact_level) {
          case 'High':
            impact = 0.6;
            highImpactEvents++;
            eventDescriptions.push(`${event.title} (${event.currency})`);
            break;
          case 'Medium':
            impact = 0.3;
            eventDescriptions.push(`${event.title} (${event.currency})`);
            break;
          case 'Low':
            impact = 0.1;
            break;
        }
        
        // Apply sentiment from the event
        if (event.sentiment_score) {
          impact *= event.sentiment_score;
        }
        
        totalImpact += impact;
      }
    });
    
    const description = eventDescriptions.length > 0 
      ? `Upcoming events: ${eventDescriptions.slice(0, 3).join(', ')}`
      : 'No major economic events';
    
    return {
      impact_score: Math.max(-1, Math.min(1, totalImpact)),
      impact_description: description
    };
  }
}
