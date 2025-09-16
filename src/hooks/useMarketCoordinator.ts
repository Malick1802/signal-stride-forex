import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { realTimeManager } from './useRealTimeManager';

interface MarketState {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: string;
  change24h: number;
  changePercentage: number;
  isMarketOpen: boolean;
}

interface SyncedSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  current_price: number;
  current_pips: number;
  current_percentage: number;
  status: string;
  synchronized_at: string;
}

interface CoordinatorState {
  marketStates: Map<string, MarketState>;
  signals: Map<string, SyncedSignal>;
  isConnected: boolean;
  lastSync: number;
  dataVersion: number;
  sessionId: string;
}

export const useMarketCoordinator = () => {
  const [state, setState] = useState<CoordinatorState>({
    marketStates: new Map(),
    signals: new Map(),
    isConnected: false,
    lastSync: 0,
    dataVersion: 0,
    sessionId: ''
  });

  const sessionIdRef = useRef<string>('');
  const mountedRef = useRef(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate unique session ID
  useEffect(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setState(prev => ({ ...prev, sessionId: sessionIdRef.current }));
  }, []);

  // Sync with coordinator
  const syncWithCoordinator = useCallback(async (action = 'sync_all_markets') => {
    if (!mountedRef.current) return;

    try {
      console.log(`🎯 Syncing with market coordinator: ${action}`);

      const { data, error } = await supabase.functions.invoke('market-coordinator', {
        body: { action, payload: { sessionId: sessionIdRef.current } }
      });

      if (error) {
        console.error('❌ Coordinator sync error:', error);
        setState(prev => ({ ...prev, isConnected: false }));
        return;
      }

      if (data?.syncPacket) {
        const packet = data.syncPacket;
        
        // Update market states
        if (packet.data.marketStates) {
          const marketMap = new Map<string, MarketState>();
          packet.data.marketStates.forEach((market: any) => {
            marketMap.set(market.symbol, {
              symbol: market.symbol,
              price: market.current_price || market.fastforex_price || 0,
              bid: market.bid || 0,
              ask: market.ask || 0,
              timestamp: market.last_update || market.fastforex_timestamp || new Date().toISOString(),
              change24h: market.price_change_24h || 0,
              changePercentage: 0, // Calculate if needed
              isMarketOpen: market.is_market_open !== false
            });
          });

          setState(prev => ({
            ...prev,
            marketStates: marketMap,
            isConnected: true,
            lastSync: Date.now(),
            dataVersion: packet.dataVersion
          }));
        }

        // Update signals
        if (packet.data.activeSignals || packet.data.signals) {
          const signalsData = packet.data.activeSignals || packet.data.signals;
          const signalMap = new Map<string, SyncedSignal>();
          
          signalsData.forEach((signal: any) => {
            signalMap.set(signal.id, {
              id: signal.id,
              symbol: signal.symbol,
              type: signal.type,
              price: signal.price || 0,
              current_price: signal.current_price || signal.price || 0,
              current_pips: signal.current_pips || 0,
              current_percentage: signal.current_percentage || 0,
              status: signal.status,
              synchronized_at: signal.synchronized_at || new Date().toISOString()
            });
          });

          setState(prev => ({
            ...prev,
            signals: signalMap,
            lastSync: Date.now(),
            dataVersion: packet.dataVersion
          }));
        }

        console.log(`✅ Coordinator sync complete: ${state.marketStates.size} markets, ${state.signals.size} signals`);
      }

    } catch (error) {
      console.error('💥 Coordinator sync failed:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, [state.marketStates.size, state.signals.size]);

  // Broadcast update to all clients
  const broadcastUpdate = useCallback(async (type: string, data: any) => {
    try {
      await supabase.functions.invoke('market-coordinator', {
        body: {
          action: 'broadcast_update',
          payload: {
            type,
            data,
            sessionId: sessionIdRef.current
          }
        }
      });
      console.log(`📢 Broadcasted ${type} update`);
    } catch (error) {
      console.error('❌ Broadcast failed:', error);
    }
  }, []);

  // Set up real-time coordination
  useEffect(() => {
    mountedRef.current = true;

    // Initial sync
    syncWithCoordinator();

    // Set up real-time event handling through centralized manager
    const unsubscribe = realTimeManager.subscribe(`coordinator_${sessionIdRef.current}`, (event) => {
      if (!mountedRef.current) return;

      console.log(`🔔 Coordinator received real-time event: ${event.type}`);

      switch (event.type) {
        case 'market_data_update':
          if (event.data.symbol) {
            const market = event.data.new_record || event.data;
            setState(prev => {
              const newMarketStates = new Map(prev.marketStates);
              newMarketStates.set(market.symbol, {
                symbol: market.symbol,
                price: market.current_price || market.fastforex_price || 0,
                bid: market.bid || 0,
                ask: market.ask || 0,
                timestamp: market.last_update || market.fastforex_timestamp || new Date().toISOString(),
                change24h: market.price_change_24h || 0,
                changePercentage: 0,
                isMarketOpen: market.is_market_open !== false
              });

              return {
                ...prev,
                marketStates: newMarketStates,
                lastSync: Date.now(),
                isConnected: true
              };
            });
          }
          break;

        case 'signal_update':
          if (event.data.new_record) {
            const signal = event.data.new_record;
            setState(prev => {
              const newSignals = new Map(prev.signals);
              newSignals.set(signal.id, {
                id: signal.id,
                symbol: signal.symbol,
                type: signal.type,
                price: signal.price || 0,
                current_price: signal.current_price || signal.price || 0,
                current_pips: signal.current_pips || 0,
                current_percentage: signal.current_percentage || 0,
                status: signal.status,
                synchronized_at: new Date().toISOString()
              });

              return {
                ...prev,
                signals: newSignals,
                lastSync: Date.now(),
                isConnected: true
              };
            });
          }
          break;

        case 'heartbeat':
          setState(prev => ({
            ...prev,
            isConnected: true,
            lastSync: Date.now()
          }));
          break;
      }
    });

    // Periodic sync to ensure coordination
    const syncInterval = setInterval(() => {
      if (mountedRef.current) {
        const timeSinceSync = Date.now() - state.lastSync;
        // Re-sync every 5 minutes to maintain coordination
        if (timeSinceSync > 300000) {
          console.log('🔄 Periodic coordinator sync...');
          syncWithCoordinator();
        }
      }
    }, 60000); // Check every minute

    return () => {
      mountedRef.current = false;
      unsubscribe();
      clearInterval(syncInterval);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [syncWithCoordinator, state.lastSync]);

  // Get market data for a specific symbol
  const getMarketData = useCallback((symbol: string): MarketState | null => {
    return state.marketStates.get(symbol) || null;
  }, [state.marketStates]);

  // Get signal data for a specific ID
  const getSignalData = useCallback((signalId: string): SyncedSignal | null => {
    return state.signals.get(signalId) || null;
  }, [state.signals]);

  // Force full synchronization
  const forceSync = useCallback(() => {
    return syncWithCoordinator('sync_all_markets');
  }, [syncWithCoordinator]);

  return {
    // State
    isConnected: state.isConnected,
    lastSync: state.lastSync,
    dataVersion: state.dataVersion,
    sessionId: state.sessionId,
    
    // Data accessors
    marketStates: state.marketStates,
    signals: state.signals,
    getMarketData,
    getSignalData,
    
    // Actions
    syncWithCoordinator,
    broadcastUpdate,
    forceSync,
    
    // Stats
    stats: {
      totalMarkets: state.marketStates.size,
      totalSignals: state.signals.size,
      connectedSince: state.lastSync,
      isRealTimeActive: state.isConnected
    }
  };
};