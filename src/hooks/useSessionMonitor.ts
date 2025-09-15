import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface SessionHealth {
  isHealthy: boolean;
  lastCheck: Date | null;
  consecutiveErrors: number;
  tokenExpiresAt: Date | null;
  needsRefresh: boolean;
  isRefreshing: boolean;
}

interface SessionBackup {
  session: Session;
  timestamp: number;
  expiresAt: number;
}

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const MAX_CONSECUTIVE_ERRORS = 3;
const SESSION_BACKUP_KEY = 'session_backup';

export const useSessionMonitor = () => {
  const [sessionHealth, setSessionHealth] = useState<SessionHealth>({
    isHealthy: true,
    lastCheck: null,
    consecutiveErrors: 0,
    tokenExpiresAt: null,
    needsRefresh: false,
    isRefreshing: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  // Backup session to secure storage
  const backupSession = useCallback((session: Session) => {
    if (!session) return;
    
    try {
      const backup: SessionBackup = {
        session,
        timestamp: Date.now(),
        expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + (60 * 60 * 1000) // 1 hour default
      };
      
      if (Capacitor.isNativePlatform()) {
        localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(backup));
      }
    } catch (error) {
      console.warn('SessionMonitor: Failed to backup session:', error);
    }
  }, []);

  // Restore session from backup
  const restoreSessionFromBackup = useCallback(async (): Promise<Session | null> => {
    try {
      const backupStr = localStorage.getItem(SESSION_BACKUP_KEY);
      if (!backupStr) return null;
      
      const backup: SessionBackup = JSON.parse(backupStr);
      
      // Check if backup is still valid
      if (Date.now() > backup.expiresAt) {
        localStorage.removeItem(SESSION_BACKUP_KEY);
        return null;
      }
      
      console.log('SessionMonitor: Attempting to restore session from backup');
      
      // Try to refresh the backed up session
      const { data, error } = await supabase.auth.setSession({
        access_token: backup.session.access_token,
        refresh_token: backup.session.refresh_token,
      });
      
      if (error) {
        console.warn('SessionMonitor: Failed to restore session:', error);
        localStorage.removeItem(SESSION_BACKUP_KEY);
        return null;
      }
      
      return data.session;
    } catch (error) {
      console.warn('SessionMonitor: Error restoring session:', error);
      localStorage.removeItem(SESSION_BACKUP_KEY);
      return null;
    }
  }, []);

  // Check session health
  const checkSessionHealth = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('SessionMonitor: Session check error:', error);
        setSessionHealth(prev => ({
          ...prev,
          isHealthy: false,
          consecutiveErrors: prev.consecutiveErrors + 1,
          lastCheck: new Date(),
        }));
        return false;
      }
      
      if (!session) {
        // Try to restore from backup
        const restoredSession = await restoreSessionFromBackup();
        if (restoredSession) {
          console.log('SessionMonitor: Session restored from backup');
          backupSession(restoredSession);
          setSessionHealth(prev => ({
            ...prev,
            isHealthy: true,
            consecutiveErrors: 0,
            lastCheck: new Date(),
            tokenExpiresAt: restoredSession.expires_at ? new Date(restoredSession.expires_at * 1000) : null,
          }));
          return true;
        }
        
        setSessionHealth(prev => ({
          ...prev,
          isHealthy: false,
          consecutiveErrors: prev.consecutiveErrors + 1,
          lastCheck: new Date(),
          tokenExpiresAt: null,
        }));
        return false;
      }
      
      // Backup healthy session
      backupSession(session);
      
      // Check if token needs refresh
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const needsRefresh = expiresAt ? (expiresAt.getTime() - Date.now()) < TOKEN_REFRESH_BUFFER : false;
      
      setSessionHealth(prev => ({
        ...prev,
        isHealthy: true,
        consecutiveErrors: 0,
        lastCheck: new Date(),
        tokenExpiresAt: expiresAt,
        needsRefresh,
      }));
      
      return true;
    } catch (error) {
      console.error('SessionMonitor: Health check failed:', error);
      setSessionHealth(prev => ({
        ...prev,
        isHealthy: false,
        consecutiveErrors: prev.consecutiveErrors + 1,
        lastCheck: new Date(),
      }));
      return false;
    }
  }, [backupSession, restoreSessionFromBackup]);

  // Refresh session token
  const refreshSession = useCallback(async (): Promise<boolean> => {
    // Prevent multiple concurrent refresh attempts
    if (refreshPromiseRef.current) {
      try {
        await refreshPromiseRef.current;
        return sessionHealth.isHealthy;
      } catch {
        return false;
      }
    }
    
    setSessionHealth(prev => ({ ...prev, isRefreshing: true }));
    
    const refreshOperation = async (): Promise<void> => {
      try {
        console.log('SessionMonitor: Refreshing session token');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('SessionMonitor: Token refresh failed:', error);
          throw error;
        }
        
        if (data.session) {
          console.log('SessionMonitor: Token refreshed successfully');
          backupSession(data.session);
          
          setSessionHealth(prev => ({
            ...prev,
            isHealthy: true,
            consecutiveErrors: 0,
            needsRefresh: false,
            tokenExpiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000) : null,
          }));
        }
      } catch (error) {
        console.error('SessionMonitor: Refresh failed:', error);
        setSessionHealth(prev => ({
          ...prev,
          isHealthy: false,
          consecutiveErrors: prev.consecutiveErrors + 1,
        }));
        throw error;
      }
    };
    
    refreshPromiseRef.current = refreshOperation();
    
    try {
      await refreshPromiseRef.current;
      return true;
    } catch {
      return false;
    } finally {
      refreshPromiseRef.current = null;
      setSessionHealth(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [sessionHealth.isHealthy, backupSession]);

  // Handle network reconnection
  const handleNetworkReconnection = useCallback(async () => {
    console.log('SessionMonitor: Network reconnected, checking session');
    const isHealthy = await checkSessionHealth();
    
    if (!isHealthy || sessionHealth.needsRefresh) {
      await refreshSession();
    }
  }, [checkSessionHealth, refreshSession, sessionHealth.needsRefresh]);

  // Auto-refresh when needed
  useEffect(() => {
    if (sessionHealth.needsRefresh && !sessionHealth.isRefreshing) {
      console.log('SessionMonitor: Auto-refreshing token before expiry');
      refreshSession();
    }
  }, [sessionHealth.needsRefresh, sessionHealth.isRefreshing, refreshSession]);

  // Set up monitoring interval
  useEffect(() => {
    // Initial health check
    checkSessionHealth();
    
    // Set up periodic health checks
    intervalRef.current = setInterval(() => {
      checkSessionHealth();
    }, SESSION_CHECK_INTERVAL);
    
    // Listen for network events
    const handleOnline = () => {
      console.log('SessionMonitor: Device came online');
      handleNetworkReconnection();
    };
    
    const handleOffline = () => {
      console.log('SessionMonitor: Device went offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for visibility changes (app foreground/background)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('SessionMonitor: App came to foreground, checking session');
        checkSessionHealth();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkSessionHealth, handleNetworkReconnection]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    sessionHealth,
    checkSessionHealth,
    refreshSession,
    handleNetworkReconnection,
    restoreSessionFromBackup,
  };
};