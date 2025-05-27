
export interface MarketAnalysis {
  shouldTrade: boolean;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  analysis: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MarketDataItem {
  symbol: string;
  current_price: string | number;
  price_change_24h?: number;
}

export interface HistoricalDataPoint {
  price: string | number;
  timestamp: string;
}
