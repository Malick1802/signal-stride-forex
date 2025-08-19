
// DEPRECATED: Use centralized server-calculated performance instead
// This hook is now for backward compatibility only
// All performance data comes from trading_signals table columns:
// current_pips, current_percentage, current_pnl, current_price

interface CentralizedSignalPerformance {
  current_pips: number;
  current_percentage: number;
  current_pnl: number;
  current_price: number | null;
}

interface SignalPerformance {
  pips: number;
  percentage: number;
  isProfit: boolean;
  profitLoss: number;
}

export const useSignalPerformance = ({ 
  centralizedData 
}: { centralizedData: CentralizedSignalPerformance }): SignalPerformance => {
  return {
    pips: centralizedData.current_pips || 0,
    percentage: centralizedData.current_percentage || 0,
    isProfit: (centralizedData.current_pips || 0) > 0,
    profitLoss: centralizedData.current_pnl || 0
  };
};
