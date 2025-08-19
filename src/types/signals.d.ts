
// Signal type definitions for TypeScript

export interface TradingSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  stop_loss: number;
  take_profits: number[];
  confidence: number;
  pips: number;
  status: 'active' | 'expired' | 'cancelled';
  is_centralized: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  analysis_text?: string;
  chart_data?: { time: number; price: number }[];
  targets_hit?: number[];
  trailing_stop?: number | null;
  market_conditions?: string[];
}

export interface SignalOutcome {
  id: string;
  signal_id: string;
  hit_target: boolean;
  exit_price: number;
  exit_timestamp: string;
  target_hit_level?: number;
  pnl_pips: number;
  notes?: string;
}
