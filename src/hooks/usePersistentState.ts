import { useState, useEffect, useCallback, useRef } from 'react';

interface PersistentStateOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  syncAcrossTabs?: boolean;
}

export function usePersistentState<T>(options: PersistentStateOptions<T>) {
  const {
    key,
    defaultValue,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = false
  } = options;

  const [state, setState] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load initial state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsedValue = deserialize(stored);
        setState(parsedValue);
      }
    } catch (error) {
      console.warn(`Failed to load persistent state for key "${key}":`, error);
    } finally {
      setIsLoaded(true);
    }
  }, [key, deserialize]);

  // Save state with debouncing
  const saveState = useCallback((newState: T) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const serialized = serialize(newState);
        localStorage.setItem(key, serialized);
      } catch (error) {
        console.warn(`Failed to save persistent state for key "${key}":`, error);
      }
    }, 100); // Debounce saves by 100ms
  }, [key, serialize]);

  // Update state and persist
  const updateState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState)
        : newState;
      
      saveState(nextState);
      return nextState;
    });
  }, [saveState]);

  // Clear state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState(defaultValue);
    } catch (error) {
      console.warn(`Failed to clear persistent state for key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = deserialize(e.newValue);
          setState(newValue);
        } catch (error) {
          console.warn(`Failed to sync state from storage for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize, syncAcrossTabs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    setState: updateState,
    clearState,
    isLoaded
  };
}

// Specialized hook for mobile app UI state
export function useMobileUIState() {
  return usePersistentState({
    key: 'mobile_ui_state',
    defaultValue: {
      currentView: 'dashboard',
      selectedTab: 0,
      scrollPositions: {} as Record<string, number>,
      expandedSections: {} as Record<string, boolean>,
      lastRoute: '/',
      userPreferences: {
        theme: 'dark',
        autoRefresh: true,
        showNotifications: true
      }
    },
    syncAcrossTabs: false
  });
}

// Specialized hook for mobile auth state
export function useMobileAuthState() {
  return usePersistentState({
    key: 'mobile_auth_persistence',
    defaultValue: {
      lastAuthCheck: 0,
      authAttempts: 0,
      rememberSession: true,
      biometricEnabled: false
    },
    syncAcrossTabs: false
  });
}