import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMarketCoordinator } from './useMarketCoordinator';

interface SessionPresence {
  sessionId: string;
  userId: string | null;
  deviceType: string;
  lastSeen: number;
  dataVersion: number;
}

interface SyncedState {
  currentPrices: Map<string, number>;
  signalPerformances: Map<string, { pips: number; percentage: number }>;
  chartData: Map<string, any[]>;
  lastUpdate: number;
}

export const useSessionSync = () => {
  const [presence, setPresence] = useState<SessionPresence[]>([]);
  const [syncedState, setSyncedState] = useState<SyncedState>({
    currentPrices: new Map(),
    signalPerformances: new Map(),
    chartData: new Map(),
    lastUpdate: 0
  });
  
  const { 
    isConnected: coordinatorConnected, 
    marketStates, 
    signals, 
    sessionId,
    broadcastUpdate 
  } = useMarketCoordinator();
  
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const deviceType = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop';

  // Initialize session presence
  useEffect(() => {
    if (!coordinatorConnected || !sessionId) return;

    mountedRef.current = true;
    
    // Create unique presence channel
    const presenceChannel = supabase.channel('session-sync', {
      config: {
        presence: {
          key: sessionId
        }
      }
    });

    channelRef.current = presenceChannel;

    // Set up presence tracking
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const activeSessions: SessionPresence[] = [];
        
        Object.entries(newState).forEach(([key, presences]: [string, any[]]) => {
          presences.forEach((presence) => {
            activeSessions.push({
              sessionId: key,
              userId: presence.userId || null,
              deviceType: presence.deviceType || 'unknown',
              lastSeen: presence.lastSeen || Date.now(),
              dataVersion: presence.dataVersion || 0
            });
          });
        });

        setPresence(activeSessions);
        console.log(`🔗 Session sync: ${activeSessions.length} active sessions`);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`➕ Session joined: ${key}`, newPresences);
        
        // Broadcast current state to new session
        if (syncedState.lastUpdate > 0) {
          broadcastStateUpdate('session_join_sync', {
            marketStates: Array.from(marketStates.entries()),
            signals: Array.from(signals.entries()),
            currentPrices: Array.from(syncedState.currentPrices.entries()),
            signalPerformances: Array.from(syncedState.signalPerformances.entries())
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`➖ Session left: ${key}`, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && mountedRef.current) {
          // Track this session's presence
          await presenceChannel.track({
            userId: (await supabase.auth.getUser()).data.user?.id || null,
            deviceType,
            lastSeen: Date.now(),
            dataVersion: Date.now(),
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [coordinatorConnected, sessionId, deviceType, marketStates, signals, syncedState.lastUpdate, broadcastUpdate]);

  // Sync state with coordinator data
  useEffect(() => {
    if (!coordinatorConnected) return;

    const newCurrentPrices = new Map<string, number>();
    const newSignalPerformances = new Map<string, { pips: number; percentage: number }>();
    const newChartData = new Map<string, any[]>();

    // Update prices from market states
    marketStates.forEach((market, symbol) => {
      newCurrentPrices.set(symbol, market.price);
      
      // Generate chart data for this symbol
      const chartPoints = generateChartData(market);
      newChartData.set(symbol, chartPoints);
    });

    // Update signal performances
    signals.forEach((signal, signalId) => {
      newSignalPerformances.set(signalId, {
        pips: signal.current_pips,
        percentage: signal.current_percentage
      });
    });

    setSyncedState({
      currentPrices: newCurrentPrices,
      signalPerformances: newSignalPerformances,
      chartData: newChartData,
      lastUpdate: Date.now()
    });

  }, [marketStates, signals, coordinatorConnected]);

  // Broadcast state updates to other sessions
  const broadcastStateUpdate = useCallback(async (type: string, data: any) => {
    if (!coordinatorConnected || !channelRef.current) return;

    try {
      await broadcastUpdate('session_sync', {
        type,
        data,
        sessionId,
        deviceType,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Failed to broadcast state update:', error);
    }
  }, [coordinatorConnected, sessionId, deviceType, broadcastUpdate]);

  // Get synchronized price for a symbol
  const getSyncedPrice = useCallback((symbol: string): number | null => {
    return syncedState.currentPrices.get(symbol) || null;
  }, [syncedState.currentPrices]);

  // Get synchronized signal performance
  const getSyncedSignalPerformance = useCallback((signalId: string): { pips: number; percentage: number } | null => {
    return syncedState.signalPerformances.get(signalId) || null;
  }, [syncedState.signalPerformances]);

  // Get synchronized chart data
  const getSyncedChartData = useCallback((symbol: string): any[] => {
    return syncedState.chartData.get(symbol) || [];
  }, [syncedState.chartData]);

  return {
    // Session state
    activeSessions: presence,
    isSessionSynced: coordinatorConnected && presence.length > 0,
    sessionId,
    deviceType,
    
    // Data accessors
    getSyncedPrice,
    getSyncedSignalPerformance,
    getSyncedChartData,
    
    // Actions
    broadcastStateUpdate,
    
    // Synced data
    syncedPrices: syncedState.currentPrices,
    syncedPerformances: syncedState.signalPerformances,
    syncedCharts: syncedState.chartData,
    
    // Stats
    stats: {
      totalActiveSessions: presence.length,
      lastSyncUpdate: syncedState.lastUpdate,
      totalSyncedPrices: syncedState.currentPrices.size,
      totalSyncedSignals: syncedState.signalPerformances.size
    }
  };
};

// Helper function to generate chart data from market state
function generateChartData(market: any): any[] {
  const now = Date.now();
  const basePrice = market.price;
  
  // Generate realistic chart points
  const points = [];
  for (let i = -20; i <= 0; i++) {
    const timestamp = now + (i * 60000); // 1 minute intervals
    const variation = (Math.random() - 0.5) * basePrice * 0.001; // Small realistic variations
    
    points.push({
      timestamp,
      time: new Date(timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }),
      price: basePrice + variation,
      volume: Math.random() * 100000 + 50000
    });
  }
  
  return points;
}