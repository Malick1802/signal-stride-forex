
import { MarketAnalysis, MarketDataItem, HistoricalDataPoint } from './types.ts';
import { calculateVolatility, calculateMomentum } from './technicalAnalysis.ts';

export async function analyzeMarketWithAI(
  pair: string, 
  currentData: MarketDataItem, 
  historicalData: HistoricalDataPoint[], 
  openAIApiKey: string
): Promise<MarketAnalysis> {
  const currentPrice = parseFloat(currentData.current_price.toString());
  const priceHistory = historicalData.slice(0, 20).map(d => parseFloat(d.price.toString()));
  
  // Calculate technical indicators
  const priceChange24h = currentData.price_change_24h || 0;
  const volatility = calculateVolatility(priceHistory);
  const momentum = calculateMomentum(priceHistory);
  const support = Math.min(...priceHistory);
  const resistance = Math.max(...priceHistory);

  const prompt = `
    Analyze ${pair} for trading opportunities:
    
    Current Price: ${currentPrice}
    24h Change: ${priceChange24h}%
    Volatility: ${volatility.toFixed(4)}
    Momentum: ${momentum.toFixed(4)}
    Support Level: ${support}
    Resistance Level: ${resistance}
    Recent Prices: ${priceHistory.slice(0, 10).join(', ')}
    
    Provide analysis in this exact JSON format:
    {
      "shouldTrade": boolean,
      "direction": "BUY" or "SELL",
      "confidence": number (0-100),
      "entryPrice": number,
      "stopLoss": number,
      "takeProfits": [number, number, number],
      "analysis": "detailed analysis text",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH"
    }
    
    Only recommend trades with 90%+ confidence based on strong technical signals.
  `;

  try {
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
            content: 'You are an expert forex analyst. Provide precise technical analysis and only recommend high-confidence trades. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;
    
    if (analysisText) {
      return JSON.parse(analysisText);
    }
    
    return { shouldTrade: false, confidence: 0 } as MarketAnalysis;
  } catch (error) {
    console.error(`Error in AI analysis for ${pair}:`, error);
    return { shouldTrade: false, confidence: 0 } as MarketAnalysis;
  }
}
