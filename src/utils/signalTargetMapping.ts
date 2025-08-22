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

  // Import pip calculator inside the function to avoid circular dependencies
  const { calculateTakeProfitPips } = require('@/utils/pipCalculator');
  const entryPriceFloat = parseFloat(entryPrice);

  return takeProfitsArray
    .map((price, index) => ({
      level: index + 1,
      price: price.toFixed(5),
      label: `Target ${index + 1}`,
      pips: calculateTakeProfitPips(entryPriceFloat, price, pair)
    }))
    .filter(tp => parseFloat(tp.price) > 0); // Filter out zero/invalid targets
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
  const { calculateTakeProfitPips } = require('@/utils/pipCalculator');
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