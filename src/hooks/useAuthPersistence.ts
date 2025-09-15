import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

interface BackgroundSync {
  isActive: boolean;
  lastSync: Date | null;
  syncInterval: NodeJS.Timeout | null;
}

const BACKGROUND_SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes
const AUTH_PERSISTENCE_KEY = 'auth_persistence_state';

export const useAuthPersistence = () => {
  const { user, session, subscription } = useAuth();
  const backgroundSyncRef = useRef<BackgroundSync>({
    isActive: false,
    lastSync: null,
    syncInterval: null
  });

  // Save auth state to persistent storage
  const saveAuthState = (user: any, session: any, subscription: any) => {
    if (!user || !session) return;
    
    try {
      const authState = {
        userId: user.id,
        email: user.email,
        sessionExpiry: session.expires_at,
        subscriptionData: subscription,
        lastSaved: Date.now(),
        deviceId: Capacitor.isNativePlatform() ? 'mobile' : 'web'
      };
      
      localStorage.setItem(AUTH_PERSISTENCE_KEY, JSON.stringify(authState));
    } catch (error) {
      console.warn('AuthPersistence: Failed to save auth state:', error);
    }
  };

  // Load auth state from persistent storage
  const loadAuthState = () => {
    try {
      const saved = localStorage.getItem(AUTH_PERSISTENCE_KEY);
      if (!saved) return null;
      
      const authState = JSON.parse(saved);
      
      // Check if saved state is still valid (not expired)
      if (authState.sessionExpiry && (authState.sessionExpiry * 1000) < Date.now()) {
        localStorage.removeItem(AUTH_PERSISTENCE_KEY);
        return null;
      }
      
      return authState;
    } catch (error) {
      console.warn('AuthPersistence: Failed to load auth state:', error);
      return null;
    }
  };

  // Start background sync for auth state
  const startBackgroundSync = () => {
    if (backgroundSyncRef.current.isActive) return;
    
    console.log('AuthPersistence: Starting background sync');
    backgroundSyncRef.current.isActive = true;
    
    backgroundSyncRef.current.syncInterval = setInterval(() => {
      if (user && session) {
        console.log('AuthPersistence: Background sync - saving auth state');
        saveAuthState(user, session, subscription);
        backgroundSyncRef.current.lastSync = new Date();
      }
    }, BACKGROUND_SYNC_INTERVAL);
  };

  // Stop background sync
  const stopBackgroundSync = () => {
    if (!backgroundSyncRef.current.isActive) return;
    
    console.log('AuthPersistence: Stopping background sync');
    backgroundSyncRef.current.isActive = false;
    
    if (backgroundSyncRef.current.syncInterval) {
      clearInterval(backgroundSyncRef.current.syncInterval);
      backgroundSyncRef.current.syncInterval = null;
    }
  };

  // Handle app visibility changes (mobile specific)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // App went to background - save current state
      if (user && session) {
        saveAuthState(user, session, subscription);
        console.log('AuthPersistence: App backgrounded, auth state saved');
      }
    } else {
      // App came to foreground - verify auth state is still valid
      console.log('AuthPersistence: App foregrounded, verifying auth state');
      const savedState = loadAuthState();
      
      if (savedState && !user) {
        console.log('AuthPersistence: Saved auth state found but no current user, may need session restoration');
      }
    }
  };

  // Handle page unload (web specific)
  const handleBeforeUnload = () => {
    if (user && session) {
      saveAuthState(user, session, subscription);
      console.log('AuthPersistence: Page unloading, auth state saved');
    }
  };

  // Handle network reconnection
  const handleNetworkReconnection = () => {
    console.log('AuthPersistence: Network reconnected, verifying auth state');
    
    // Verify current auth state is still valid
    if (user && session) {
      const savedState = loadAuthState();
      if (!savedState || savedState.userId !== user.id) {
        console.log('AuthPersistence: Auth state mismatch after reconnection, saving current state');
        saveAuthState(user, session, subscription);
      }
    }
  };

  // Effect to manage auth persistence
  useEffect(() => {
    if (user && session) {
      // Save auth state when user is authenticated
      saveAuthState(user, session, subscription);
      startBackgroundSync();
    } else {
      // Clear auth state when user is not authenticated
      localStorage.removeItem(AUTH_PERSISTENCE_KEY);
      stopBackgroundSync();
    }
  }, [user, session, subscription]);

  // Effect to set up event listeners
  useEffect(() => {
    // Mobile-specific listeners
    if (Capacitor.isNativePlatform()) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // Web-specific listeners
    if (!Capacitor.isNativePlatform()) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    // Universal listeners
    window.addEventListener('online', handleNetworkReconnection);
    
    return () => {
      // Clean up listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleNetworkReconnection);
      
      // Stop background sync
      stopBackgroundSync();
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopBackgroundSync();
    };
  }, []);

  return {
    saveAuthState,
    loadAuthState,
    backgroundSync: backgroundSyncRef.current,
  };
};