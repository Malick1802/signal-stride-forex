
interface CachedSignal {
  id: string;
  data: any;
  timestamp: number;
  version: number;
}

interface CacheStats {
  totalSignals: number;
  lastSync: number;
  cacheSize: number;
  isStale: boolean;
}

export class OfflineSignalCache {
  private dbName = 'ForexSignalsCache';
  private dbVersion = 1;
  private storeName = 'signals';
  private maxCacheSize = 50;
  private staleThreshold = 5 * 60 * 1000; // 5 minutes
  private isStorageAvailable: boolean | null = null;
  private memoryCache: Map<string, CachedSignal> = new Map();

  private async checkStorageAvailability(): Promise<boolean> {
    if (this.isStorageAvailable !== null) {
      return this.isStorageAvailable;
    }

    try {
      // Test IndexedDB availability
      if (!('indexedDB' in window)) {
        this.isStorageAvailable = false;
        return false;
      }

      // Test if we can actually open a database
      const testDB = await new Promise<boolean>((resolve) => {
        const request = indexedDB.open('storage-test', 1);
        request.onerror = () => resolve(false);
        request.onsuccess = () => {
          request.result.close();
          indexedDB.deleteDatabase('storage-test');
          resolve(true);
        };
        request.onupgradeneeded = () => {
          // Database creation succeeded
        };
      });

      this.isStorageAvailable = testDB;
      return testDB;
    } catch (error) {
      console.warn('⚠️ Storage availability check failed:', error);
      this.isStorageAvailable = false;
      return false;
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    const isAvailable = await this.checkStorageAvailability();
    if (!isAvailable) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async cacheSignals(signals: any[]): Promise<void> {
    try {
      const isStorageAvailable = await this.checkStorageAvailability();
      
      if (!isStorageAvailable) {
        // Fallback to memory cache
        const timestamp = Date.now();
        for (const signal of signals) {
          this.memoryCache.set(signal.id, {
            id: signal.id,
            data: signal,
            timestamp,
            version: 1
          });
        }
        console.log(`📦 Cached ${signals.length} signals in memory (storage unavailable)`);
        return;
      }

      const db = await this.openDB();
      
      // Clear old cache if we exceed max size first
      const allKeys = await this.getAllKeys();
      if (allKeys.length > this.maxCacheSize) {
        await this.clearOldEntries();
      }
      
      // Create a new transaction for putting data
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const timestamp = Date.now();
      
      // Process all signals in a single transaction
      const promises = signals.map(signal => {
        const cachedSignal: CachedSignal = {
          id: signal.id,
          data: signal,
          timestamp,
          version: 1
        };
        
        return new Promise<void>((resolve, reject) => {
          const request = store.put(cachedSignal);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      // Wait for transaction to complete
      await Promise.all(promises);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      
      console.log(`📦 Cached ${signals.length} signals offline`);
    } catch (error) {
      console.error('❌ Error caching signals, falling back to memory:', error);
      // Fallback to memory cache
      const timestamp = Date.now();
      for (const signal of signals) {
        this.memoryCache.set(signal.id, {
          id: signal.id,
          data: signal,
          timestamp,
          version: 1
        });
      }
      console.log(`📦 Cached ${signals.length} signals in memory (fallback)`);
    }
  }

  async getCachedSignals(): Promise<any[]> {
    try {
      const isStorageAvailable = await this.checkStorageAvailability();
      
      if (!isStorageAvailable) {
        // Use memory cache
        const signals = Array.from(this.memoryCache.values());
        signals.sort((a, b) => b.timestamp - a.timestamp);
        console.log(`📦 Retrieved ${signals.length} cached signals from memory`);
        return signals.map(s => s.data);
      }

      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const signals = await new Promise<CachedSignal[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Sort by timestamp, newest first
      signals.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`📦 Retrieved ${signals.length} cached signals`);
      return signals.map(s => s.data);
    } catch (error) {
      console.error('❌ Error retrieving cached signals, using memory fallback:', error);
      // Fallback to memory cache
      const signals = Array.from(this.memoryCache.values());
      signals.sort((a, b) => b.timestamp - a.timestamp);
      console.log(`📦 Retrieved ${signals.length} cached signals from memory (fallback)`);
      return signals.map(s => s.data);
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    try {
      const isStorageAvailable = await this.checkStorageAvailability();
      
      if (!isStorageAvailable) {
        // Use memory cache stats
        const signals = Array.from(this.memoryCache.values());
        const lastSync = signals.length > 0 ? Math.max(...signals.map(s => s.timestamp)) : 0;
        const isStale = Date.now() - lastSync > this.staleThreshold;
        
        return {
          totalSignals: signals.length,
          lastSync,
          cacheSize: signals.length,
          isStale
        };
      }

      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const lastEntry = await this.getLatestEntry();
      const lastSync = lastEntry?.timestamp || 0;
      const isStale = Date.now() - lastSync > this.staleThreshold;
      
      return {
        totalSignals: count,
        lastSync,
        cacheSize: count,
        isStale
      };
    } catch (error) {
      console.error('❌ Error getting cache stats, using memory fallback:', error);
      // Fallback to memory cache stats
      const signals = Array.from(this.memoryCache.values());
      const lastSync = signals.length > 0 ? Math.max(...signals.map(s => s.timestamp)) : 0;
      const isStale = Date.now() - lastSync > this.staleThreshold;
      
      return {
        totalSignals: signals.length,
        lastSync,
        cacheSize: signals.length,
        isStale
      };
    }
  }

  private async getAllKeys(): Promise<IDBValidKey[]> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {
      return [];
    }
  }

  private async getLatestEntry(): Promise<CachedSignal | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('timestamp');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async clearOldEntries(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      const entriesToKeep = this.maxCacheSize - 10; // Keep some buffer
      let count = 0;
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev');
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            count++;
            if (count > entriesToKeep) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('⚠️ Could not clear old entries:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log('📦 Cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }
}

export const offlineSignalCache = new OfflineSignalCache();
