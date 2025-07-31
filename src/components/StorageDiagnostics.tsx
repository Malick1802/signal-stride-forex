import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface StorageInfo {
  indexedDB: boolean;
  cacheStorage: boolean;
  localStorage: boolean;
  quota?: number;
  usage?: number;
  error?: string;
}

export const StorageDiagnostics: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStorageHealth = async () => {
    setLoading(true);
    const info: StorageInfo = {
      indexedDB: false,
      cacheStorage: false,
      localStorage: false
    };

    try {
      // Check IndexedDB
      if ('indexedDB' in window) {
        try {
          const request = indexedDB.open('storage-test', 1);
          await new Promise((resolve, reject) => {
            request.onsuccess = () => {
              request.result.close();
              indexedDB.deleteDatabase('storage-test');
              info.indexedDB = true;
              resolve(true);
            };
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = () => {
              // Database creation succeeded
            };
          });
        } catch (error) {
          console.warn('IndexedDB test failed:', error);
        }
      }

      // Check CacheStorage
      if ('caches' in window) {
        try {
          await caches.open('storage-test');
          await caches.delete('storage-test');
          info.cacheStorage = true;
        } catch (error) {
          console.warn('CacheStorage test failed:', error);
        }
      }

      // Check localStorage
      try {
        localStorage.setItem('storage-test', 'test');
        localStorage.removeItem('storage-test');
        info.localStorage = true;
      } catch (error) {
        console.warn('localStorage test failed:', error);
      }

      // Check storage quota if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          info.quota = estimate.quota;
          info.usage = estimate.usage;
        } catch (error) {
          console.warn('Storage quota check failed:', error);
        }
      }

      setStorageInfo(info);
    } catch (error) {
      setStorageInfo({
        ...info,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllStorage = async () => {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              return new Promise<void>((resolve) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => resolve(); // Continue even if failed
              });
            }
          })
        );
      }

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }

      alert('All storage cleared successfully! Please refresh the page.');
    } catch (error) {
      alert('Failed to clear storage: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    checkStorageHealth();
  }, []);

  if (!storageInfo) {
    return null;
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Storage Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between">
            <span>IndexedDB</span>
            <Badge variant={storageInfo.indexedDB ? "default" : "destructive"}>
              {storageInfo.indexedDB ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              {storageInfo.indexedDB ? 'Available' : 'Failed'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>CacheStorage</span>
            <Badge variant={storageInfo.cacheStorage ? "default" : "destructive"}>
              {storageInfo.cacheStorage ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              {storageInfo.cacheStorage ? 'Available' : 'Failed'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span>localStorage</span>
            <Badge variant={storageInfo.localStorage ? "default" : "destructive"}>
              {storageInfo.localStorage ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              {storageInfo.localStorage ? 'Available' : 'Failed'}
            </Badge>
          </div>
        </div>

        {(storageInfo.quota || storageInfo.usage) && (
          <div className="space-y-2">
            <h4 className="font-medium">Storage Quota</h4>
            <div className="text-sm text-muted-foreground">
              <div>Used: {formatBytes(storageInfo.usage)}</div>
              <div>Available: {formatBytes(storageInfo.quota)}</div>
              {storageInfo.quota && storageInfo.usage && (
                <div>Usage: {Math.round((storageInfo.usage / storageInfo.quota) * 100)}%</div>
              )}
            </div>
          </div>
        )}

        {storageInfo.error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{storageInfo.error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={checkStorageHealth}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recheck
          </Button>
          
          <Button
            onClick={clearAllStorage}
            variant="destructive"
            size="sm"
          >
            Clear All Storage
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Note:</strong> If storage is failing, the app will use memory-based fallbacks.</p>
          <p>For persistent issues, try clearing all storage and refreshing the page.</p>
        </div>
      </CardContent>
    </Card>
  );
};