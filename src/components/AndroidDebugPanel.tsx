import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface DebugInfo {
  platform: string;
  isNative: boolean;
  networkStatus: any;
  connectionTests: {
    supabase: 'pending' | 'success' | 'failed';
    fastforex: 'pending' | 'success' | 'failed';
  };
}

const AndroidDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    platform: '',
    isNative: false,
    networkStatus: null,
    connectionTests: {
      supabase: 'pending',
      fastforex: 'pending'
    }
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    initializeDebugInfo();
  }, []);

  const initializeDebugInfo = async () => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    let networkStatus = null;

    if (isNative) {
      try {
        networkStatus = await Network.getStatus();
      } catch (error) {
        console.error('Failed to get network status:', error);
      }
    }

    setDebugInfo(prev => ({
      ...prev,
      platform,
      isNative,
      networkStatus
    }));

    // Run connection tests
    await testConnections();
  };

  const testConnections = async () => {
    // Test Supabase connection
    try {
      const response = await fetch('https://ugtaodrvbpfeyhdgmisn.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndGFvZHJ2YnBmZXloZGdtaXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjA2MTUsImV4cCI6MjA0OTYzNjYxNX0.Z-71hRCpHB0YivrsTb2kZQdObcF42BQVYIQ8_yMb_JM'
        }
      });
      
      setDebugInfo(prev => ({
        ...prev,
        connectionTests: {
          ...prev.connectionTests,
          supabase: response.ok ? 'success' : 'failed'
        }
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        connectionTests: {
          ...prev.connectionTests,
          supabase: 'failed'
        }
      }));
    }

    // Test FastForex connection
    try {
      const response = await fetch('https://api.fastforex.io/', { method: 'HEAD' });
      
      setDebugInfo(prev => ({
        ...prev,
        connectionTests: {
          ...prev.connectionTests,
          fastforex: response.ok ? 'success' : 'failed'
        }
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        connectionTests: {
          ...prev.connectionTests,
          fastforex: 'failed'
        }
      }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <div className="h-4 w-4 border-2 border-yellow-400 rounded-full animate-spin" />;
    }
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-20 right-4 z-50 bg-black/80 border-white/20 text-white"
      >
        Debug
      </Button>
    );
  }

  return (
    <div className="fixed inset-4 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="bg-slate-900 border-slate-700 text-white max-w-md w-full max-h-[80vh] overflow-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Android Debug Panel</h3>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              ×
            </Button>
          </div>

          <div className="space-y-4">
            {/* Platform Info */}
            <div>
              <h4 className="font-medium mb-2">Platform Info</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Platform:</span>
                  <Badge variant="outline">{debugInfo.platform}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Native:</span>
                  <Badge variant={debugInfo.isNative ? "default" : "secondary"}>
                    {debugInfo.isNative ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Network Status */}
            {debugInfo.networkStatus && (
              <div>
                <h4 className="font-medium mb-2">Network Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Connected:</span>
                    <div className="flex items-center gap-2">
                      {debugInfo.networkStatus.connected ? (
                        <Wifi className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-400" />
                      )}
                      <span>{debugInfo.networkStatus.connected ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Type:</span>
                    <Badge variant="outline">{debugInfo.networkStatus.connectionType}</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Device Info */}
            <div>
              <h4 className="font-medium mb-2">Device Info</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">User Agent:</span>
                  <span className="text-sm truncate max-w-32">{navigator.userAgent.split(' ')[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Online:</span>
                  <Badge variant={navigator.onLine ? "default" : "destructive"}>
                    {navigator.onLine ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Connection Tests */}
            <div>
              <h4 className="font-medium mb-2">Connection Tests</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Supabase:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(debugInfo.connectionTests.supabase)}
                    <span className="text-sm capitalize">{debugInfo.connectionTests.supabase}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">FastForex:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(debugInfo.connectionTests.fastforex)}
                    <span className="text-sm capitalize">{debugInfo.connectionTests.fastforex}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-700">
              <Button
                onClick={() => {
                  setDebugInfo(prev => ({
                    ...prev,
                    connectionTests: { supabase: 'pending', fastforex: 'pending' }
                  }));
                  testConnections();
                }}
                className="w-full"
                size="sm"
              >
                Retest Connections
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AndroidDebugPanel;