import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealTimeEvent {
  type: 'signal_update' | 'market_data_update' | 'signal_outcome_update' | 'heartbeat';
  data: any;
  timestamp: number;
}

interface RealTimeSubscription {
  id: string;
  callback: (event: RealTimeEvent) => void;
}

interface RealTimeState {
  isConnected: boolean;
  lastHeartbeat: number;
  connectionAttempts: number;
  activeChannels: string[];
}

// Singleton class for managing all real-time connections
class RealTimeManager {
  private static instance: RealTimeManager | null = null;
  private subscriptions: Map<string, RealTimeSubscription> = new Map();
  private channels: Map<string, any> = new Map();
  private state: RealTimeState = {
    isConnected: false,
    lastHeartbeat: 0,
    connectionAttempts: 0,
    activeChannels: []
  };
  private stateListeners: Set<(state: RealTimeState) => void> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  static getInstance(): RealTimeManager {
    if (!RealTimeManager.instance) {
      RealTimeManager.instance = new RealTimeManager();
    }
    return RealTimeManager.instance;
  }

  private constructor() {
    this.setupCoreChannels();
  }

  private updateState(newState: Partial<RealTimeState>) {
    this.state = { ...this.state, ...newState };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  private broadcast(event: RealTimeEvent) {
    console.log('🔔 Broadcasting real-time event:', event.type, event.data);
    this.subscriptions.forEach(subscription => {
      try {
        subscription.callback(event);
      } catch (error) {
        console.error('Error in real-time subscription callback:', error);
      }
    });
  }

  private setupCoreChannels() {
    // 1. Trading Signals Channel - consistent name for all clients
    const signalsChannel = supabase
      .channel('trading-signals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        },
        (payload) => {
          console.log('📡 Signal update received:', payload.eventType, payload);
          this.broadcast({
            type: 'signal_update',
            data: { ...payload, eventType: payload.eventType },
            timestamp: Date.now()
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Trading signals channel:', status);
        this.handleChannelStatus('trading-signals', status);
      });

    // 2. Signal Outcomes Channel
    const outcomesChannel = supabase
      .channel('signal-outcomes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signal_outcomes'
        },
        (payload) => {
          this.broadcast({
            type: 'signal_outcome_update',
            data: payload,
            timestamp: Date.now()
          });
        }
      )
      .subscribe((status) => {
        console.log('📊 Signal outcomes channel:', status);
        this.handleChannelStatus('signal-outcomes', status);
      });

    // 3. Centralized Market Data Channel (reduced channel churn)
    const centralizedMarketChannel = supabase
      .channel('centralized-market-data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'centralized_market_state'
        },
        (payload) => {
          this.broadcast({
            type: 'market_data_update',
            data: payload,
            timestamp: Date.now()
          });
        }
      )
      .subscribe((status) => {
        console.log('📈 Centralized market data channel:', status);
        this.handleChannelStatus('centralized-market-data', status);
      });

    this.channels.set('centralized-market-data', centralizedMarketChannel);

    // 4. Heartbeat Channel for connection monitoring
    const heartbeatChannel = supabase
      .channel('realtime-heartbeat')
      .on('presence', { event: 'sync' }, () => {
        this.updateHeartbeat();
      })
      .subscribe(async (status) => {
        console.log('💓 Heartbeat channel:', status);
        this.handleChannelStatus('realtime-heartbeat', status);
        
        if (status === 'SUBSCRIBED') {
          // Track presence to establish connection
          await heartbeatChannel.track({ 
            online_at: new Date().toISOString(),
            client_id: Math.random().toString(36).substr(2, 9)
          });
          this.updateHeartbeat();
        }
      });

    // Store channels
    this.channels.set('trading-signals', signalsChannel);
    this.channels.set('signal-outcomes', outcomesChannel);
    this.channels.set('realtime-heartbeat', heartbeatChannel);

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
  }

  private handleChannelStatus(channelName: string, status: string) {
    const activeChannels = Array.from(this.channels.keys()).filter(name => {
      // You'd need to track individual channel statuses here
      return true; // Simplified for now
    });

    if (status === 'SUBSCRIBED') {
      this.updateState({
        isConnected: true,
        connectionAttempts: 0,
        activeChannels
      });
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      this.updateState({
        isConnected: false,
        connectionAttempts: this.state.connectionAttempts + 1,
        activeChannels
      });
      
      // Auto-reconnect with exponential backoff
      this.scheduleReconnect();
    }
  }

  private updateHeartbeat() {
    this.updateState({
      lastHeartbeat: Date.now(),
      isConnected: true
    });

    this.broadcast({
      type: 'heartbeat',
      data: { timestamp: Date.now() },
      timestamp: Date.now()
    });
  }

  private startHeartbeatMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceHeartbeat = now - this.state.lastHeartbeat;

      // If no heartbeat for 60 seconds, consider disconnected (increased tolerance)
      if (timeSinceHeartbeat > 60000 && this.state.isConnected) {
        console.warn('💔 Heartbeat timeout detected');
        this.updateState({ isConnected: false });
        this.scheduleReconnect();
      }
    }, 10000); // Check every 10 seconds
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.state.connectionAttempts), 30000);
    
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.state.connectionAttempts + 1})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private reconnect() {
    console.log('🔄 Reconnecting real-time channels...');
    
    // Clean up existing channels
    this.cleanup();
    
    // Re-setup all channels
    this.setupCoreChannels();
  }

  public subscribe(id: string, callback: (event: RealTimeEvent) => void): () => void {
    console.log('🔗 New real-time subscription:', id);
    
    this.subscriptions.set(id, { id, callback });

    // Return unsubscribe function
    return () => {
      console.log('❌ Removing real-time subscription:', id);
      this.subscriptions.delete(id);
    };
  }

  public getState(): RealTimeState {
    return { ...this.state };
  }

  public onStateChange(listener: (state: RealTimeState) => void): () => void {
    this.stateListeners.add(listener);
    
    // Immediately call with current state
    listener(this.state);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public cleanup() {
    console.log('🧹 Cleaning up real-time manager...');
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Remove all channels
    this.channels.forEach((channel, name) => {
      try {
        supabase.removeChannel(channel);
        console.log(`📡 Removed channel: ${name}`);
      } catch (error) {
        console.warn(`⚠️ Error removing channel ${name}:`, error);
      }
    });
    
    this.channels.clear();
    this.subscriptions.clear();
    this.stateListeners.clear();
    
    this.updateState({
      isConnected: false,
      activeChannels: []
    });
  }

  // Helper method for lazy market data subscription (if needed)
  public subscribeToMarketPair(pair: string): () => void {
    const channelName = `market-data-${pair}`;
    
    if (this.channels.has(channelName)) {
      console.log(`📈 Market channel ${pair} already exists`);
      return () => {};
    }

    const marketChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'centralized_market_state',
          filter: `symbol=eq.${pair}`
        },
        (payload) => {
          this.broadcast({
            type: 'market_data_update',
            data: { ...payload, symbol: pair },
            timestamp: Date.now()
          });
        }
      )
      .subscribe((status) => {
        console.log(`📈 Market data ${pair} channel:`, status);
        this.handleChannelStatus(channelName, status);
      });

    this.channels.set(channelName, marketChannel);

    return () => {
      if (this.channels.has(channelName)) {
        const channel = this.channels.get(channelName);
        supabase.removeChannel(channel);
        this.channels.delete(channelName);
        console.log(`📡 Removed market channel: ${pair}`);
      }
    };
  }
}

// React hook to use the real-time manager
export const useRealTimeManager = () => {
  const [state, setState] = useState<RealTimeState>({
    isConnected: false,
    lastHeartbeat: 0,
    connectionAttempts: 0,
    activeChannels: []
  });
  
  const managerRef = useRef<RealTimeManager>();
  const subscriptionRef = useRef<string>();

  useEffect(() => {
    // Get singleton instance
    managerRef.current = RealTimeManager.getInstance();
    
    // Subscribe to state changes
    const unsubscribeState = managerRef.current.onStateChange(setState);

    return () => {
      unsubscribeState();
    };
  }, []);

  const subscribe = useCallback((callback: (event: RealTimeEvent) => void) => {
    if (!managerRef.current) return () => {};
    
    // Generate unique subscription ID
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    subscriptionRef.current = subscriptionId;
    
    return managerRef.current.subscribe(subscriptionId, callback);
  }, []);

  const cleanup = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.cleanup();
    }
  }, []);

  return {
    state,
    subscribe,
    cleanup,
    isConnected: state.isConnected,
    lastHeartbeat: state.lastHeartbeat,
    connectionAttempts: state.connectionAttempts,
    activeChannels: state.activeChannels
  };
};

// Export singleton instance for direct access if needed
export const realTimeManager = RealTimeManager.getInstance();