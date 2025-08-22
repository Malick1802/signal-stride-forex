import { calculateTakeProfitPips } from '@/utils/pipCalculator';

export interface TakeProfit {
  level: number;
  price: string;
  label: string;
  pips: number;
}

export const mapTakeProfitsFromArray = (
  takeProfitsArray: number[] | null | undefined,
  entryPrice: string,
  pair: string
): TakeProfit[] => {
  if (!Array.isArray(takeProfitsArray) || takeProfitsArray.length === 0) {
    return [];
  }
  const entryPriceFloat = parseFloat(entryPrice);

  // Filter out zero/invalid targets BEFORE mapping to ensure correct level numbering
  const validTargets = takeProfitsArray.filter(price => price && price > 0);
  
  return validTargets
    .map((price, index) => ({
      level: index + 1, // Now correctly numbered 1, 2, 3... for only valid targets
      price: price.toFixed(5),
      label: `Target ${index + 1}`,
      pips: calculateTakeProfitPips(entryPriceFloat, price, pair)
    }));
};

export const mapTakeProfitsFromProps = (
  takeProfit1: string,
  takeProfit2: string,
  takeProfit3: string,
  entryPrice: string,
  pair: string,
  takeProfit4?: string,
  takeProfit5?: string
): TakeProfit[] => {
  const entryPriceFloat = parseFloat(entryPrice);
  
  const targets = [
    takeProfit1,
    takeProfit2,
    takeProfit3,
    takeProfit4,
    takeProfit5
  ].filter(tp => tp && tp !== '0.00000' && parseFloat(tp) > 0);

  return targets.map((price, index) => ({
    level: index + 1,
    price: price!,
    label: `Target ${index + 1}`,
    pips: calculateTakeProfitPips(entryPriceFloat, parseFloat(price!), pair)
  }));
};