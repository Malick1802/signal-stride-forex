
import { useState, useRef, useCallback } from 'react';

interface ConnectionManagerState {
  activeConnections: number;
  queuedRequests: number;
  lastRequestTime: number;
  isThrottled: boolean;
}

const MAX_CONCURRENT_CONNECTIONS = 5;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests
const CIRCUIT_BREAKER_THRESHOLD = 10; // failures before circuit opens
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

export const useConnectionManager = () => {
  const [state, setState] = useState<ConnectionManagerState>({
    activeConnections: 0,
    queuedRequests: 0,
    lastRequestTime: 0,
    isThrottled: false
  });

  const failureCount = useRef(0);
  const circuitOpen = useRef(false);
  const circuitOpenTime = useRef(0);
  const requestQueue = useRef<Array<() => Promise<void>>>([]);
  const processingQueue = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingQueue.current || requestQueue.current.length === 0) {
      return;
    }

    processingQueue.current = true;

    while (requestQueue.current.length > 0 && state.activeConnections < MAX_CONCURRENT_CONNECTIONS) {
      const request = requestQueue.current.shift();
      if (request) {
        setState(prev => ({ ...prev, activeConnections: prev.activeConnections + 1 }));
        try {
          await request();
          failureCount.current = 0; // Reset on success
        } catch (error) {
          failureCount.current++;
          console.error('Request failed:', error);
          
          if (failureCount.current >= CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpen.current = true;
            circuitOpenTime.current = Date.now();
            console.warn('Circuit breaker opened due to excessive failures');
          }
        }
        setState(prev => ({ ...prev, activeConnections: prev.activeConnections - 1 }));
        
        // Throttle between requests
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL));
      }
    }

    setState(prev => ({ ...prev, queuedRequests: requestQueue.current.length }));
    processingQueue.current = false;
  }, [state.activeConnections]);

  const queueRequest = useCallback((request: () => Promise<void>) => {
    // Check circuit breaker
    if (circuitOpen.current) {
      if (Date.now() - circuitOpenTime.current > CIRCUIT_BREAKER_TIMEOUT) {
        circuitOpen.current = false;
        failureCount.current = 0;
        console.log('Circuit breaker closed, resuming requests');
      } else {
        console.warn('Circuit breaker is open, rejecting request');
        return Promise.reject(new Error('Circuit breaker is open'));
      }
    }

    // Check if we should throttle
    const now = Date.now();
    const timeSinceLastRequest = now - state.lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      setState(prev => ({ ...prev, isThrottled: true }));
    } else {
      setState(prev => ({ ...prev, isThrottled: false, lastRequestTime: now }));
    }

    requestQueue.current.push(request);
    setState(prev => ({ ...prev, queuedRequests: requestQueue.current.length }));
    
    processQueue();
    return Promise.resolve();
  }, [state.lastRequestTime, processQueue]);

  const getConnectionStatus = useCallback(() => ({
    ...state,
    circuitOpen: circuitOpen.current,
    failureCount: failureCount.current,
    isHealthy: !circuitOpen.current && state.activeConnections < MAX_CONCURRENT_CONNECTIONS
  }), [state]);

  return {
    queueRequest,
    getConnectionStatus,
    isThrottled: state.isThrottled,
    activeConnections: state.activeConnections,
    queuedRequests: state.queuedRequests
  };
};
