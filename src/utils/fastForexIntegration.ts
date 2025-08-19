/**
 * FastForex API Integration
 * Multi-timeframe market data fetching for professional analysis
 */

export interface FastForexResponse {
  base: string;
  results: Record<string, number>;
  updated: string;
  ms: number;
}

export interface TimeframeData {
  timeframe: '1M' | '5M' | '15M' | '1H' | '4H' | 'D';
  data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }[];
}

export interface MarketDataSnapshot {
  symbol: string;
  currentPrice: number;
  timeframes: TimeframeData[];
  timestamp: number;
}

// Major currency pairs for analysis
export const MAJOR_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'CHFJPY', 'EURCHF', 'GBPCHF', 'AUDCHF',
  'CADJPY', 'NZDJPY', 'AUDNZD', 'GBPAUD', 'GBPCAD', 'GBPNZD', 'EURAUD',
  'EURCAD', 'EURNZD', 'AUDCAD', 'NZDCAD', 'NZDCHF'
];

// Base currencies for cross-rate calculation
export const BASE_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];

/**
 * Fetch current exchange rates from FastForex API
 */
export async function fetchExchangeRates(apiKey: string): Promise<Record<string, number>> {
  const baseUrl = 'https://api.fastforex.io/fetch-multi';
  const fromCurrency = 'USD';
  const toCurrencies = BASE_CURRENCIES.filter(c => c !== 'USD').join(',');
  
  const url = `${baseUrl}?from=${fromCurrency}&to=${toCurrencies}&api_key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FastForex API error: ${response.status} ${response.statusText}`);
  }
  
  const data: FastForexResponse = await response.json();
  
  // Add USD/USD = 1 for completeness
  const rates: Record<string, number> = { USD: 1 };
  
  // Add direct USD rates
  Object.entries(data.results).forEach(([currency, rate]) => {
    rates[currency] = rate;
  });
  
  return rates;
}

/**
 * Calculate cross-currency pair rates from base USD rates
 */
export function calculateCrossPairs(usdRates: Record<string, number>): Record<string, number> {
  const crossPairs: Record<string, number> = {};
  
  MAJOR_PAIRS.forEach(pair => {
    const baseCurrency = pair.substring(0, 3);
    const quoteCurrency = pair.substring(3, 6);
    
    const baseRate = usdRates[baseCurrency] || 1;
    const quoteRate = usdRates[quoteCurrency] || 1;
    
    // For USD pairs: direct rate or 1/rate
    if (baseCurrency === 'USD') {
      crossPairs[pair] = quoteRate;
    } else if (quoteCurrency === 'USD') {
      crossPairs[pair] = 1 / baseRate;
    } else {
      // For cross pairs: base/quote = (USD/quote) / (USD/base)
      crossPairs[pair] = quoteRate / baseRate;
    }
  });
  
  return crossPairs;
}

/**
 * Generate synthetic OHLCV data for multiple timeframes
 * In production, this would fetch real historical data
 */
export function generateSyntheticOHLCV(
  currentPrice: number, 
  timeframe: TimeframeData['timeframe'], 
  periods: number = 100
): TimeframeData['data'] {
  const data: TimeframeData['data'] = [];
  
  // Timeframe intervals in minutes
  const intervals = {
    '1M': 1,
    '5M': 5,
    '15M': 15,
    '1H': 60,
    '4H': 240,
    'D': 1440
  };
  
  const intervalMs = intervals[timeframe] * 60 * 1000;
  let currentTime = Date.now() - (periods * intervalMs);
  let price = currentPrice * (0.98 + Math.random() * 0.04); // Start near current price
  
  for (let i = 0; i < periods; i++) {
    const open = price;
    
    // Generate realistic price movement
    const volatility = 0.002; // 0.2% base volatility
    const trend = (Math.random() - 0.5) * 0.001; // Small trend component
    const noise = (Math.random() - 0.5) * volatility;
    
    const priceChange = trend + noise;
    const high = open * (1 + Math.abs(priceChange) + Math.random() * volatility);
    const low = open * (1 - Math.abs(priceChange) - Math.random() * volatility);
    const close = open * (1 + priceChange);
    
    // Ensure OHLC logic consistency
    const finalHigh = Math.max(open, close, high);
    const finalLow = Math.min(open, close, low);
    
    data.push({
      time: currentTime,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(finalHigh.toFixed(5)),
      low: parseFloat(finalLow.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.floor(1000 + Math.random() * 9000) // Synthetic volume
    });
    
    price = close;
    currentTime += intervalMs;
  }
  
  return data;
}

/**
 * Fetch comprehensive market data for a currency pair
 */
export async function fetchMarketDataSnapshot(
  symbol: string, 
  currentPrice: number,
  apiKey?: string
): Promise<MarketDataSnapshot> {
  const timeframes: TimeframeData[] = [
    {
      timeframe: '1M',
      data: generateSyntheticOHLCV(currentPrice, '1M', 60)
    },
    {
      timeframe: '5M',
      data: generateSyntheticOHLCV(currentPrice, '5M', 100)
    },
    {
      timeframe: '15M',
      data: generateSyntheticOHLCV(currentPrice, '15M', 100)
    },
    {
      timeframe: '1H',
      data: generateSyntheticOHLCV(currentPrice, '1H', 200)
    },
    {
      timeframe: '4H',
      data: generateSyntheticOHLCV(currentPrice, '4H', 200)
    },
    {
      timeframe: 'D',
      data: generateSyntheticOHLCV(currentPrice, 'D', 365)
    }
  ];
  
  return {
    symbol,
    currentPrice,
    timeframes,
    timestamp: Date.now()
  };
}

/**
 * Validate market hours for forex trading
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const utcHour = now.getUTCHours();
  
  // Forex market is closed Saturday 22:00 UTC to Sunday 22:00 UTC
  if (utcDay === 6 && utcHour >= 22) return false; // Saturday evening
  if (utcDay === 0 && utcHour < 22) return false; // Sunday before evening
  
  return true;
}

/**
 * Get current trading session
 */
export function getCurrentTradingSession(): 'ASIAN' | 'EUROPEAN' | 'US' | 'OVERLAP' {
  const utcHour = new Date().getUTCHours();
  
  // Asian session: 22:00 - 07:00 UTC (Sydney/Tokyo)
  if (utcHour >= 22 || utcHour < 7) return 'ASIAN';
  
  // European session: 07:00 - 16:00 UTC (London)
  if (utcHour >= 7 && utcHour < 16) return 'EUROPEAN';
  
  // US session: 13:00 - 22:00 UTC (New York)
  if (utcHour >= 13 && utcHour < 22) {
    // Overlap with European: 13:00 - 16:00 UTC
    if (utcHour < 16) return 'OVERLAP';
    return 'US';
  }
  
  return 'US';
}

/**
 * Economic calendar simulation (simplified)
 */
export function getEconomicEvents(symbol: string): Array<{
  currency: string;
  event: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}> {
  const baseCurrency = symbol.substring(0, 3);
  const quoteCurrency = symbol.substring(3, 6);
  
  const events = [
    { currency: 'USD', event: 'NFP Release', impact: 'HIGH' as const, sentiment: 'POSITIVE' as const },
    { currency: 'EUR', event: 'ECB Interest Rate', impact: 'HIGH' as const, sentiment: 'NEUTRAL' as const },
    { currency: 'GBP', event: 'BOE Policy Decision', impact: 'HIGH' as const, sentiment: 'POSITIVE' as const },
    { currency: 'JPY', event: 'BOJ Meeting', impact: 'MEDIUM' as const, sentiment: 'NEUTRAL' as const }
  ];
  
  return events.filter(event => 
    event.currency === baseCurrency || event.currency === quoteCurrency
  );
}