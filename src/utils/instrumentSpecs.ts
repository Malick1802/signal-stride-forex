// Centralized instrument specifications and helpers
export type InstrumentCategory = 'forex' | 'metal' | 'index' | 'crypto' | 'unknown';

export interface InstrumentSpec {
  category: InstrumentCategory;
  symbol: string;
  pipSize: number; // price change per pip
  pipMultiplier: number; // pips = priceDiff * pipMultiplier
  displayDecimals: number; // for UI formatting
  contractSize: number; // standard lot contract size
  baseCurrency?: string;
  quoteCurrency?: string;
}

const INDEX_SYMBOLS = new Set([
  'US30','DJI','DJ30','GER40','DE40','DAX','SPX500','US500','SP500','NAS100','US100','NDX'
]);

const normalize = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const parseForexParts = (symbol: string): { base: string; quote: string } | null => {
  const s = normalize(symbol);
  if (s.length < 6) return null;
  const base = s.slice(0, 3);
  const quote = s.slice(-3);
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote)) return null;
  return { base, quote };
};

export const getInstrumentSpec = (rawSymbol: string): InstrumentSpec => {
  const symbol = normalize(rawSymbol);

  // Metals
  if (symbol.startsWith('XAU')) {
    return {
      category: 'metal',
      symbol,
      pipSize: 0.1,
      pipMultiplier: 10,
      displayDecimals: 2,
      contractSize: 100, // 100 oz per lot
      baseCurrency: 'XAU',
      quoteCurrency: symbol.slice(-3) || 'USD',
    };
  }
  if (symbol.startsWith('XAG')) {
    return {
      category: 'metal',
      symbol,
      pipSize: 0.01,
      pipMultiplier: 100,
      displayDecimals: 3,
      contractSize: 5000, // 5,000 oz per lot
      baseCurrency: 'XAG',
      quoteCurrency: symbol.slice(-3) || 'USD',
    };
  }

  // Indices
  if (INDEX_SYMBOLS.has(symbol)) {
    return {
      category: 'index',
      symbol,
      pipSize: 1,
      pipMultiplier: 1,
      displayDecimals: 0,
      contractSize: 1,
    };
  }

  // Crypto (basic default)
  if (symbol.startsWith('BTC') || symbol.startsWith('ETH')) {
    return {
      category: 'crypto',
      symbol,
      pipSize: 1,
      pipMultiplier: 1,
      displayDecimals: 2,
      contractSize: 1,
    };
  }

  // Forex (default)
  const parts = parseForexParts(symbol);
  if (parts) {
    const isJPY = parts.base === 'JPY' || parts.quote === 'JPY';
    return {
      category: 'forex',
      symbol,
      pipSize: isJPY ? 0.01 : 0.0001,
      pipMultiplier: isJPY ? 100 : 10000,
      displayDecimals: isJPY ? 3 : 5,
      contractSize: 100000,
      baseCurrency: parts.base,
      quoteCurrency: parts.quote,
    };
  }

  // Fallback
  return {
    category: 'unknown',
    symbol,
    pipSize: 0.0001,
    pipMultiplier: 10000,
    displayDecimals: 5,
    contractSize: 1,
  };
};
