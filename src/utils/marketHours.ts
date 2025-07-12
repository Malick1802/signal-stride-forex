
export interface MarketSession {
  name: string;
  isOpen: boolean;
  nextOpenTime?: Date;
  nextCloseTime?: Date;
}

export const checkMarketHours = (): MarketSession => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Forex market is closed from Friday 22:00 UTC to Sunday 22:00 UTC
  const isFridayEvening = utcDay === 5 && utcHour >= 22;
  const isSaturday = utcDay === 6;
  const isSundayBeforeOpen = utcDay === 0 && utcHour < 22;
  
  const isMarketClosed = isFridayEvening || isSaturday || isSundayBeforeOpen;
  
  let nextOpenTime: Date | undefined;
  let nextCloseTime: Date | undefined;
  
  if (isMarketClosed) {
    // Calculate next market open (Sunday 22:00 UTC)
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - now.getUTCDay()) % 7;
    nextSunday.setUTCDate(now.getUTCDate() + (daysUntilSunday === 0 ? 0 : daysUntilSunday));
    nextSunday.setUTCHours(22, 0, 0, 0);
    
    if (utcDay === 0 && utcHour < 22) {
      // We're on Sunday before 22:00, so next open is today
      nextOpenTime = nextSunday;
    } else {
      // We need to go to next Sunday
      nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
      nextOpenTime = nextSunday;
    }
  } else {
    // Market is open, calculate next close (Friday 22:00 UTC)
    const nextFriday = new Date(now);
    const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7;
    nextFriday.setUTCDate(now.getUTCDate() + daysUntilFriday);
    nextFriday.setUTCHours(22, 0, 0, 0);
    
    if (nextFriday <= now) {
      nextFriday.setUTCDate(nextFriday.getUTCDate() + 7);
    }
    nextCloseTime = nextFriday;
  }
  
  return {
    name: isMarketClosed ? 'Market Closed' : getMarketSessionName(utcHour),
    isOpen: !isMarketClosed,
    nextOpenTime,
    nextCloseTime
  };
};

export const getMarketSessionName = (utcHour: number): string => {
  if (utcHour >= 22 || utcHour < 8) {
    return 'Asian Session';
  } else if (utcHour >= 8 && utcHour < 16) {
    return 'European Session';
  } else if (utcHour >= 13 && utcHour < 17) {
    return 'US-EU Overlap';
  } else {
    return 'US Session';
  }
};

export const isDataStale = (timestamp: string | Date, maxAgeMinutes: number = 10): boolean => {
  const dataTime = new Date(timestamp);
  const now = new Date();
  const ageMinutes = (now.getTime() - dataTime.getTime()) / (1000 * 60);
  
  return ageMinutes > maxAgeMinutes;
};

export const getLastMarketCloseTime = (): Date => {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();
  
  const lastFriday = new Date(now);
  const daysToLastFriday = (now.getUTCDay() + 2) % 7; // Days since last Friday
  
  if (utcDay === 5 && utcHour < 22) {
    // It's Friday before 22:00, so last close was previous Friday
    lastFriday.setUTCDate(now.getUTCDate() - 7);
  } else {
    lastFriday.setUTCDate(now.getUTCDate() - daysToLastFriday);
  }
  
  lastFriday.setUTCHours(22, 0, 0, 0);
  return lastFriday;
};
