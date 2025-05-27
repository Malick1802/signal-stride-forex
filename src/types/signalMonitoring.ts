
export interface SignalToMonitor {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  status: string;
}

export interface SignalOutcomeParams {
  signal: SignalToMonitor;
  currentPrice: number;
  exitPrice: number;
  hitTarget: boolean;
  targetLevel: number;
}
