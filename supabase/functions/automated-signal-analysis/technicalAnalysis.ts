
export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

export function calculateMomentum(prices: number[]): number {
  if (prices.length < 10) return 0;
  const recent = prices.slice(0, 5).reduce((sum, p) => sum + p, 0) / 5;
  const older = prices.slice(5, 10).reduce((sum, p) => sum + p, 0) / 5;
  return (recent - older) / older;
}
