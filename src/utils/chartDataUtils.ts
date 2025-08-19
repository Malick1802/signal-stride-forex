// Utility functions for processing chart data from various sources

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  price: number;
  isEntry?: boolean;
  isFrozen?: boolean;
}

// Convert various timestamp formats to milliseconds
export const normalizeTimestamp = (timestamp: any): number => {
  if (typeof timestamp === 'number') {
    // Handle microseconds (timestamps > 1e15)
    if (timestamp > 1e15) {
      return Math.floor(timestamp / 1000); // Convert microseconds to milliseconds
    }
    // Handle seconds (timestamps < 1e12)
    if (timestamp < 1e12) {
      return timestamp * 1000; // Convert seconds to milliseconds
    }
    // Already milliseconds
    return timestamp;
  }
  
  if (typeof timestamp === 'string') {
    const parsed = parseFloat(timestamp);
    if (!isNaN(parsed)) {
      return normalizeTimestamp(parsed);
    }
  }
  
  return Date.now(); // Fallback to current time
};

// Process raw chart data from database into display format
export const processChartData = (rawData: any[]): ChartDataPoint[] => {
  if (!Array.isArray(rawData)) return [];
  
  return rawData
    .filter(point => 
      point && 
      typeof point === 'object' && 
      point.price !== null && 
      point.price !== undefined &&
      !isNaN(parseFloat(point.price))
    )
    .map(point => {
      const timestamp = normalizeTimestamp(point.time || point.timestamp);
      const price = parseFloat(point.price);
      
      return {
        timestamp,
        time: new Date(timestamp).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }),
        price,
        isEntry: point.isEntry || false,
        isFrozen: point.isFrozen || false
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
};

// Create fallback chart data when no historical data is available
export const createFallbackChartData = (
  currentPrice?: number, 
  entryPrice?: number,
  isMarketOpen: boolean = true
): ChartDataPoint[] => {
  const now = Date.now();
  const points: ChartDataPoint[] = [];
  
  if (entryPrice && typeof entryPrice === 'number' && !isNaN(entryPrice)) {
    // Create historical points around entry price
    const variation = isMarketOpen ? entryPrice * 0.0001 : 0;
    
    points.push({
      timestamp: now - 300000, // 5 minutes ago
      time: new Date(now - 300000).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: entryPrice - variation,
      isEntry: false,
      isFrozen: !isMarketOpen
    });
    
    points.push({
      timestamp: now - 60000, // 1 minute ago
      time: new Date(now - 60000).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: entryPrice,
      isEntry: true,
      isFrozen: !isMarketOpen
    });
  }
  
  if (currentPrice && typeof currentPrice === 'number' && !isNaN(currentPrice)) {
    points.push({
      timestamp: now,
      time: new Date(now).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: currentPrice,
      isEntry: false,
      isFrozen: !isMarketOpen
    });
  }
  
  return points.length > 0 ? points : [];
};

// Merge historical data with current price
export const mergeChartDataWithCurrentPrice = (
  historicalData: ChartDataPoint[],
  currentPrice?: number,
  maxAge: number = 300000 // 5 minutes
): ChartDataPoint[] => {
  const now = Date.now();
  const result = [...historicalData];
  
  if (currentPrice && typeof currentPrice === 'number' && !isNaN(currentPrice)) {
    // Remove old current price points
    const filtered = result.filter(point => 
      point.isEntry || (now - point.timestamp) <= maxAge
    );
    
    // Add new current price point
    filtered.push({
      timestamp: now,
      time: new Date(now).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: currentPrice,
      isEntry: false,
      isFrozen: false
    });
    
    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  return result;
};