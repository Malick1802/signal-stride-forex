import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Wifi, WifiOff, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface SystemStatus {
  platform: string;
  connectivity: 'online' | 'offline';
  authentication: 'authenticated' | 'unauthenticated';
  pushToken: 'registered' | 'not_registered' | 'error';
  lastCheck: Date;
}

export const SystemStatusMonitor: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus>({
    platform: Capacitor.getPlatform(),
    connectivity: navigator.onLine ? 'online' : 'offline',
    authentication: 'unauthenticated',
    pushToken: 'not_registered',
    lastCheck: new Date()
  });

  const { user } = useAuth();
  const { isRegistered, pushToken, permissionError } = usePushNotifications();

  useEffect(() => {
    const updateStatus = () => {
      setStatus(prev => ({
        ...prev,
        connectivity: navigator.onLine ? 'online' : 'offline',
        authentication: user ? 'authenticated' : 'unauthenticated',
        pushToken: permissionError ? 'error' : (isRegistered ? 'registered' : 'not_registered'),
        lastCheck: new Date()
      }));
    };

    // Initial update
    updateStatus();

    // Listen for connectivity changes
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [user, isRegistered, permissionError]);

  const getStatusIcon = (statusType: string, value: string) => {
    switch (value) {
      case 'online':
      case 'authenticated':
      case 'registered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
      case 'unauthenticated':
      case 'not_registered':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (value: string) => {
    switch (value) {
      case 'online':
      case 'authenticated':
      case 'registered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
      case 'unauthenticated':
      case 'not_registered':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-Time System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Platform</span>
            </div>
            <Badge variant="outline" className={getStatusColor(status.platform)}>
              {status.platform}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.connectivity === 'online' ? 
                <Wifi className="h-4 w-4" /> : 
                <WifiOff className="h-4 w-4" />
              }
              <span className="text-sm font-medium">Connectivity</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon('connectivity', status.connectivity)}
              <Badge variant="outline" className={getStatusColor(status.connectivity)}>
                {status.connectivity}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon('authentication', status.authentication)}
              <span className="text-sm font-medium">Authentication</span>
            </div>
            <Badge variant="outline" className={getStatusColor(status.authentication)}>
              {status.authentication}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon('pushToken', status.pushToken)}
              <span className="text-sm font-medium">Push Token</span>
            </div>
            <Badge variant="outline" className={getStatusColor(status.pushToken)}>
              {status.pushToken.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {pushToken && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800 mb-1">Active Push Token</p>
            <p className="text-xs font-mono text-blue-600 break-all">
              {pushToken.substring(0, 60)}...
            </p>
          </div>
        )}

        {permissionError && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Push Error:</strong> {permissionError}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Last checked: {status.lastCheck.toLocaleTimeString()}</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setStatus(prev => ({ ...prev, lastCheck: new Date() }))}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatusMonitor;