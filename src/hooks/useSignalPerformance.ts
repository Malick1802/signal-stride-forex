
import { useMemo } from 'react';

interface UseSignalPerformanceProps {
  entryPrice: number;
  currentPrice: number | null;
  signalType: 'BUY' | 'SELL';
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
  signalType 
}: UseSignalPerformanceProps): SignalPerformance => {
  return useMemo(() => {
    if (!currentPrice || !entryPrice) {
      return {
        pips: 0,
        percentage: 0,
        isProfit: false,
        profitLoss: 0
      };
    }

    let pips = 0;
    let isProfit = false;
    let profitLoss = 0;

    if (signalType === 'BUY') {
      profitLoss = currentPrice - entryPrice;
      pips = profitLoss * 10000;
      isProfit = currentPrice > entryPrice;
    } else {
      profitLoss = entryPrice - currentPrice;
      pips = profitLoss * 10000;
      isProfit = entryPrice > currentPrice;
    }

    const percentage = entryPrice > 0 ? Math.abs(profitLoss / entryPrice) * 100 : 0;
    
    return {
      pips: Math.round(pips),
      percentage: isProfit ? percentage : -percentage,
      isProfit,
      profitLoss
    };
  }, [entryPrice, currentPrice, signalType]);
};
