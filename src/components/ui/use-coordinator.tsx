import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMarketCoordinator } from '@/hooks/useMarketCoordinator';
import { useSessionSync } from '@/hooks/useSessionSync';

interface CoordinatorContextValue {
  // Market coordination
  isCoordinatorConnected: boolean;
  getSyncedPrice: (symbol: string) => number | null;
  getSyncedSignalPerformance: (signalId: string) => { pips: number; percentage: number } | null;
  getSyncedChartData: (symbol: string) => any[];
  
  // Session coordination
  activeSessions: number;
  isSessionSynced: boolean;
  
  // Actions
  forceSync: () => Promise<void>;
  broadcastUpdate: (type: string, data: any) => Promise<void>;
  
  // Stats
  stats: {
    totalMarkets: number;
    totalSignals: number;
    totalSessions: number;
    lastSync: number;
  };
}

const CoordinatorContext = createContext<CoordinatorContextValue | null>(null);

export const CoordinatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  
  const coordinator = useMarketCoordinator();
  const sessionSync = useSessionSync();
  
  useEffect(() => {
    // Mark as ready once coordinator is connected
    if (coordinator.isConnected) {
      setIsReady(true);
    }
  }, [coordinator.isConnected]);

  const contextValue: CoordinatorContextValue = {
    // Market coordination
    isCoordinatorConnected: coordinator.isConnected,
    getSyncedPrice: sessionSync.getSyncedPrice,
    getSyncedSignalPerformance: sessionSync.getSyncedSignalPerformance,
    getSyncedChartData: sessionSync.getSyncedChartData,
    
    // Session coordination
    activeSessions: sessionSync.stats.totalActiveSessions,
    isSessionSynced: sessionSync.isSessionSynced,
    
    // Actions
    forceSync: coordinator.forceSync,
    broadcastUpdate: coordinator.broadcastUpdate,
    
    // Stats
    stats: {
      totalMarkets: coordinator.stats.totalMarkets,
      totalSignals: coordinator.stats.totalSignals,
      totalSessions: sessionSync.stats.totalActiveSessions,
      lastSync: Math.max(coordinator.lastSync, sessionSync.stats.lastSyncUpdate)
    }
  };

  return (
    <CoordinatorContext.Provider value={contextValue}>
      {children}
      {isReady && (
        <div className="fixed bottom-2 right-2 z-50">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
            coordinator.isConnected && sessionSync.isSessionSynced
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : coordinator.isConnected
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              coordinator.isConnected && sessionSync.isSessionSynced
                ? 'bg-green-400 animate-pulse'
                : coordinator.isConnected
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-red-400'
            }`} />
            <span>
              {coordinator.isConnected && sessionSync.isSessionSynced
                ? `Synchronized (${sessionSync.stats.totalActiveSessions} sessions)`
                : coordinator.isConnected
                ? 'Coordinator Online'
                : 'Connecting...'
              }
            </span>
          </div>
        </div>
      )}
    </CoordinatorContext.Provider>
  );
};

export const useCoordinator = (): CoordinatorContextValue => {
  const context = useContext(CoordinatorContext);
  if (!context) {
    throw new Error('useCoordinator must be used within a CoordinatorProvider');
  }
  return context;
};