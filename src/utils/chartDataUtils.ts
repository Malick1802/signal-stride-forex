// Utility functions for processing chart data from various sources

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  price: number;
  isEntry?: boolean;
  isFrozen?: boolean;
}

// Normalize timestamp from various formats to milliseconds
export const normalizeTimestamp = (timestamp: any): number => {
  // Handle null/undefined
  if (!timestamp) return Date.now();
  
  // Already a number - check if it needs conversion
  if (typeof timestamp === 'number') {
    // Handle scientific notation (e.g., 1.755614071534e+12)
    if (timestamp > 1e15) {
      return Math.floor(timestamp / 1000); // Convert microseconds to milliseconds
    }
    // If it's already in milliseconds range (13 digits)
    if (timestamp > 1e12) {
      return Math.floor(timestamp);
    }
    // If it's in seconds (10 digits), convert to milliseconds
    if (timestamp > 1e9) {
      return timestamp * 1000;
    }
    // Very small numbers, treat as seconds
    return timestamp * 1000;
  }
  
  // Handle string timestamps
  if (typeof timestamp === 'string') {
    // Try parsing scientific notation or regular numbers
    const parsed = parseFloat(timestamp);
    if (!isNaN(parsed)) {
      return normalizeTimestamp(parsed);
    }
    // Try Date parsing
    const dateTime = new Date(timestamp).getTime();
    if (!isNaN(dateTime)) {
      return dateTime;
    }
  }
  
  // Fallback to current time
  return Date.now();
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