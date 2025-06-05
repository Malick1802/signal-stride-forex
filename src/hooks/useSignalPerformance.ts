
import { useMemo } from 'react';
import { calculateSignalPerformance } from '@/utils/pipCalculator';

interface UseSignalPerformanceProps {
  entryPrice: number;
  currentPrice: number | null;
  signalType: 'BUY' | 'SELL';
  symbol: string;
}

interface SignalPerformance {
  pips: number;
  percentage: number;
  isProfit: boolean;
  profitLoss: number;
}

export const useSignalPerformance = ({ 
  entryPrice, 
  currentPrice, 
  signalType,
  symbol 
}: UseSignalPerformanceProps): SignalPerformance => {
  return useMemo(() => {
    return calculateSignalPerformance(entryPrice, currentPrice, signalType, symbol);
  }, [entryPrice, currentPrice, signalType, symbol]);
};
