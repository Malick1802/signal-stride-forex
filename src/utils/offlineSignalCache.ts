
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

  private async openDB(): Promise<IDBDatabase> {
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
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Clear old cache if we exceed max size
      const allKeys = await this.getAllKeys();
      if (allKeys.length > this.maxCacheSize) {
        await this.clearOldEntries();
      }
      
      const timestamp = Date.now();
      
      for (const signal of signals) {
        const cachedSignal: CachedSignal = {
          id: signal.id,
          data: signal,
          timestamp,
          version: 1
        };
        
        await new Promise<void>((resolve, reject) => {
          const request = store.put(cachedSignal);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      console.log(`📦 Cached ${signals.length} signals offline`);
    } catch (error) {
      console.error('❌ Error caching signals:', error);
    }
  }

  async getCachedSignals(): Promise<any[]> {
    try {
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
      console.error('❌ Error retrieving cached signals:', error);
      return [];
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    try {
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
      console.error('❌ Error getting cache stats:', error);
      return {
        totalSignals: 0,
        lastSync: 0,
        cacheSize: 0,
        isStale: true
      };
    }
  }

  private async getAllKeys(): Promise<IDBValidKey[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
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
    });
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
