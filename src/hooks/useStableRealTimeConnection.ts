import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionStatus {
  isConnected: boolean;
  lastHeartbeat: string;
  reconnectAttempts: number;
  error: string | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
}

interface ConnectionConfig {
  heartbeatInterval: number;
  connectionTimeout: number;
  maxReconnectAttempts: number;
  reconnectBackoffMultiplier: number;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  heartbeatInterval: 15000, // 15 seconds
  connectionTimeout: 30000, // 30 seconds
  maxReconnectAttempts: 5,
  reconnectBackoffMultiplier: 1.5,
};

export const useStableRealTimeConnection = (config: Partial<ConnectionConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastHeartbeat: '',
    reconnectAttempts: 0,
    error: null,
    connectionState: 'disconnected'
  });

  const channelRef = useRef<any>();
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);
  const connectionAttemptRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  const updateHeartbeat = useCallback(() => {
    if (!mountedRef.current) return;
    
    lastActivityRef.current = Date.now();
    setStatus(prev => ({
      ...prev,
      lastHeartbeat: new Date().toLocaleTimeString(),
      isConnected: true,
      error: null,
      connectionState: 'connected'
    }));
  }, []);

  const handleConnectionError = useCallback((error: string, shouldReconnect: boolean = true) => {
    if (!mountedRef.current) return;
    
    console.error('🔌 Real-time connection error:', error);
    setStatus(prev => ({
      ...prev,
      isConnected: false,
      error,
      connectionState: 'error',
      reconnectAttempts: shouldReconnect ? prev.reconnectAttempts + 1 : prev.reconnectAttempts
    }));
  }, []);

  const calculateBackoffDelay = useCallback((attempt: number) => {
    return Math.min(
      1000 * Math.pow(finalConfig.reconnectBackoffMultiplier, attempt),
      30000 // Max 30 seconds
    );
  }, [finalConfig.reconnectBackoffMultiplier]);

  const cleanupConnection = useCallback(() => {
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error removing channel:', error);
      }
      channelRef.current = null;
    }

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = undefined;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current || connectionAttemptRef.current) return;
    
    console.log('🔄 Attempting real-time connection...');
    connectionAttemptRef.current = true;
    
    setStatus(prev => ({
      ...prev,
      connectionState: 'connecting',
      error: null
    }));

    try {
      // Clean up any existing connections
      cleanupConnection();

      // Create new heartbeat channel with timeout
      const heartbeatChannel = supabase
        .channel(`heartbeat-${Date.now()}`, {
          config: {
            presence: { key: 'heartbeat' }
          }
        })
        .on('presence', { event: 'sync' }, () => {
          updateHeartbeat();
        })
        .subscribe(async (status, error) => {
          if (!mountedRef.current) return;
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time connection established');
            updateHeartbeat();
            setStatus(prev => ({
              ...prev,
              reconnectAttempts: 0,
              error: null,
              connectionState: 'connected'
            }));
            
            // Start heartbeat monitoring
            if (heartbeatRef.current) {
              clearInterval(heartbeatRef.current);
            }
            
            heartbeatRef.current = setInterval(() => {
              if (!mountedRef.current) return;
              
              const now = Date.now();
              const timeSinceActivity = now - lastActivityRef.current;
              
              // Only consider it a timeout if we haven't had activity for longer than expected
              if (timeSinceActivity > finalConfig.connectionTimeout) {
                console.warn('⚠️ Heartbeat timeout detected');
                handleConnectionError('Heartbeat timeout', true);
                reconnect();
              }
            }, finalConfig.heartbeatInterval);
            
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription error:', error);
            handleConnectionError('Channel subscription failed', true);
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Connection timed out');
            handleConnectionError('Connection timed out', true);
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Connection closed');
            handleConnectionError('Connection closed', true);
          }
        });

      channelRef.current = heartbeatChannel;

    } catch (error) {
      console.error('❌ Connection setup failed:', error);
      handleConnectionError(`Setup failed: ${(error as Error).message}`, true);
    } finally {
      connectionAttemptRef.current = false;
    }
  }, [updateHeartbeat, handleConnectionError, cleanupConnection, finalConfig]);

  const reconnect = useCallback(() => {
    if (!mountedRef.current) return;
    
    setStatus(prev => {
      if (prev.reconnectAttempts >= finalConfig.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        return {
          ...prev,
          connectionState: 'error',
          error: 'Max reconnection attempts reached'
        };
      }

      const delay = calculateBackoffDelay(prev.reconnectAttempts);
      console.log(`🔄 Scheduling reconnection attempt ${prev.reconnectAttempts + 1} in ${delay}ms`);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);

      return prev;
    });
  }, [connect, calculateBackoffDelay, finalConfig.maxReconnectAttempts]);

  const forceReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('🔄 Force reconnecting...');
    setStatus(prev => ({
      ...prev,
      reconnectAttempts: 0,
      error: null
    }));
    
    cleanupConnection();
    connect();
  }, [connect, cleanupConnection]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      cleanupConnection();
    };
  }, [connect, cleanupConnection]);

  return {
    ...status,
    reconnect: forceReconnect,
    isHealthy: status.isConnected && status.connectionState === 'connected'
  };
};
