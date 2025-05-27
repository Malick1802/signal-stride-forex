import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GlobalRefreshState {
  lastPriceUpdate: number;
  lastSignalUpdate: number;
  lastFullSync: number;
  isUpdating: boolean;
}

class GlobalRefreshService {
  private subscribers: Set<() => void> = new Set();
  private state: GlobalRefreshState = {
    lastPriceUpdate: 0,
    lastSignalUpdate: 0,
    lastFullSync: 0,
    isUpdating: false
  };

  private priceInterval: NodeJS.Timeout | null = null;
  private signalInterval: NodeJS.Timeout | null = null;
  private fullSyncInterval: NodeJS.Timeout | null = null;

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getState() {
    return { ...this.state };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }

  async triggerPriceUpdate() {
    if (this.state.isUpdating) return;
    
    this.state.isUpdating = true;
    this.state.lastPriceUpdate = Date.now();
    this.notifySubscribers();

    try {
      console.log('🔄 Global price update triggered');
      
      // Trigger centralized market update
      const { error } = await supabase.functions.invoke('centralized-market-stream');
      
      if (error) {
        console.error('❌ Global price update failed:', error);
      } else {
        console.log('✅ Global price update completed');
      }
    } catch (error) {
      console.error('❌ Global price update error:', error);
    } finally {
      this.state.isUpdating = false;
      this.notifySubscribers();
    }
  }

  async triggerSignalUpdate() {
    this.state.lastSignalUpdate = Date.now();
    this.notifySubscribers();
    
    try {
      console.log('🔄 Global signal update triggered');
      
      // No action needed - signals update automatically via real-time subscriptions
      console.log('✅ Global signal update completed');
    } catch (error) {
      console.error('❌ Global signal update error:', error);
    }
  }

  async triggerFullSync() {
    this.state.lastFullSync = Date.now();
    this.notifySubscribers();
    
    try {
      console.log('🔄 Global full sync triggered');
      
      // Trigger both price and signal updates
      await this.triggerPriceUpdate();
      await this.triggerSignalUpdate();
      
      console.log('✅ Global full sync completed');
    } catch (error) {
      console.error('❌ Global full sync error:', error);
    }
  }

  start() {
    console.log('🌐 Starting global refresh service');
    
    // Price updates every 8 seconds
    this.priceInterval = setInterval(() => {
      this.triggerPriceUpdate();
    }, 8000);

    // Signal refresh every 45 seconds
    this.signalInterval = setInterval(() => {
      this.triggerSignalUpdate();
    }, 45000);

    // Full sync every 3 minutes
    this.fullSyncInterval = setInterval(() => {
      this.triggerFullSync();
    }, 180000);

    // Initial update
    setTimeout(() => this.triggerPriceUpdate(), 1000);
  }

  stop() {
    console.log('🌐 Stopping global refresh service');
    
    if (this.priceInterval) clearInterval(this.priceInterval);
    if (this.signalInterval) clearInterval(this.signalInterval);
    if (this.fullSyncInterval) clearInterval(this.fullSyncInterval);
    
    this.priceInterval = null;
    this.signalInterval = null;
    this.fullSyncInterval = null;
  }
}

const globalRefreshService = new GlobalRefreshService();

export const useGlobalRefresh = () => {
  const [state, setState] = useState<GlobalRefreshState>(globalRefreshService.getState());
  const startedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = globalRefreshService.subscribe(() => {
      setState(globalRefreshService.getState());
    });

    // Start the service only once globally
    if (!startedRef.current) {
      globalRefreshService.start();
      startedRef.current = true;
    }

    return () => {
      unsubscribe();
      // Don't stop the service when component unmounts - keep it running globally
    };
  }, []);

  const triggerManualUpdate = useCallback(async () => {
    await globalRefreshService.triggerFullSync();
  }, []);

  return {
    ...state,
    triggerManualUpdate,
    isConnected: !state.isUpdating && Date.now() - state.lastPriceUpdate < 30000
  };
};

export { globalRefreshService };
