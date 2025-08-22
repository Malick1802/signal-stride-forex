import { useEffect, useCallback, useState } from 'react';
import { useMonitorOnlySignals } from './useMonitorOnlySignals';

export const useMobileSignalMonitoring = () => {
  const { isMonitoring } = useMonitorOnlySignals();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const monitorActiveSignals = useCallback(async () => {
    setLastRefresh(new Date());
    console.log('📱 Mobile signal monitoring refreshed');
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      monitorActiveSignals();
    }
  }, [isMonitoring, monitorActiveSignals]);

  return {
    monitorActiveSignals,
    isMonitoring,
    activeSignals: [],
    signalUpdates: [],
    signalPerformance: {
      totalSignals: 0,
      profitableSignals: 0,
      totalPips: 0,
      winRate: 0
    }
  };
};