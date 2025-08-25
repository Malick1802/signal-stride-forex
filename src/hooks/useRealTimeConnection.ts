
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionStatus {
  isConnected: boolean;
  lastHeartbeat: string;
  reconnectAttempts: number;
  error: string | null;
}

export const useRealTimeConnection = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastHeartbeat: '',
    reconnectAttempts: 0,
    error: null
  });

  const channelRef = useRef<any>();
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const updateHeartbeat = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus(prev => ({
      ...prev,
      lastHeartbeat: new Date().toLocaleTimeString(),
      isConnected: true,
      error: null
    }));
  }, []);

  const handleConnectionError = useCallback((error: string) => {
    if (!mountedRef.current) return;
    console.error('🔌 Real-time connection error:', error);
    setStatus(prev => ({
      ...prev,
      isConnected: false,
      error,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));
  }, []);

  const reconnect = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('🔄 Attempting to reconnect real-time...');
    
    // Clear existing connections
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create new heartbeat channel
    const heartbeatChannel = supabase
      .channel('heartbeat-monitor')
      .on('presence', { event: 'sync' }, () => {
        updateHeartbeat();
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time heartbeat connected');
          updateHeartbeat();
          setStatus(prev => ({
            ...prev,
            reconnectAttempts: 0,
            error: null
          }));
        } else if (status === 'CHANNEL_ERROR') {
          handleConnectionError('Channel subscription failed');
        } else if (status === 'TIMED_OUT') {
          handleConnectionError('Connection timed out');
        }
      });

    channelRef.current = heartbeatChannel;

    // Start heartbeat monitoring
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    
    heartbeatRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      // Check if we've had a recent heartbeat
      const now = Date.now();
      const lastUpdate = new Date(status.lastHeartbeat).getTime();
      const timeSinceUpdate = now - lastUpdate;
      
      if (timeSinceUpdate > 30000) { // 30 seconds without update
        handleConnectionError('Heartbeat timeout');
        
        // Auto-reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(reconnect, 5000);
      }
    }, 10000); // Check every 10 seconds
  }, [status.lastHeartbeat, updateHeartbeat, handleConnectionError]);

  useEffect(() => {
    mountedRef.current = true;
    reconnect();

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [reconnect]);

  return {
    ...status,
    reconnect
  };
};
