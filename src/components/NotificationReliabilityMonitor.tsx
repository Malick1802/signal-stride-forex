import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useNotificationReliability } from '@/hooks/useNotificationReliability';
import { Wifi, WifiOff, Bell, RefreshCw, Shield, AlertTriangle } from 'lucide-react';

export const NotificationReliabilityMonitor: React.FC = () => {
  const {
    connectionHealth,
    queuedNotifications,
    backupPollingActive,
    syncMissedNotifications,
    checkConnectionHealth
  } = useNotificationReliability();

  const getConnectionStatusIcon = () => {
    if (connectionHealth.supabaseConnected && connectionHealth.realtimeConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getConnectionStatusText = () => {
    if (connectionHealth.supabaseConnected && connectionHealth.realtimeConnected) {
      return 'Fully Connected';
    }
    if (connectionHealth.supabaseConnected) {
      return 'Basic Connection';
    }
    return 'Connection Issues';
  };

  const getConnectionStatusColor = () => {
    if (connectionHealth.supabaseConnected && connectionHealth.realtimeConnected) {
      return 'default';
    }
    if (connectionHealth.supabaseConnected) {
      return 'secondary';
    }
    return 'destructive';
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification System Status
        </CardTitle>
        <CardDescription>
          Real-time monitoring of notification delivery systems
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionStatusIcon()}
            <span className="text-sm font-medium">Connection Status</span>
          </div>
          <Badge variant={getConnectionStatusColor()}>
            {getConnectionStatusText()}
          </Badge>
        </div>

        {/* Detailed Status */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center justify-between">
            <span>Supabase API</span>
            <Badge variant={connectionHealth.supabaseConnected ? 'default' : 'destructive'} className="text-xs">
              {connectionHealth.supabaseConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Real-time</span>
            <Badge variant={connectionHealth.realtimeConnected ? 'default' : 'destructive'} className="text-xs">
              {connectionHealth.realtimeConnected ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Authentication</span>
            <Badge variant={connectionHealth.authValid ? 'default' : 'destructive'} className="text-xs">
              {connectionHealth.authValid ? 'Valid' : 'Invalid'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Backup Polling</span>
            <Badge variant={backupPollingActive ? 'secondary' : 'outline'} className="text-xs">
              {backupPollingActive ? 'Active' : 'Standby'}
            </Badge>
          </div>
        </div>

        {/* Queue Status */}
        {queuedNotifications > 0 && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Queued notifications</span>
            </div>
            <Badge variant="secondary">{queuedNotifications}</Badge>
          </div>
        )}

        {/* Backup System Alert */}
        {backupPollingActive && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Shield className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Backup notification system is active
            </span>
          </div>
        )}

        {/* Last Update */}
        <div className="text-xs text-muted-foreground">
          Last health check: {connectionHealth.lastHeartbeat > 0 
            ? new Date(connectionHealth.lastHeartbeat).toLocaleTimeString()
            : 'Never'
          }
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkConnectionHealth}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Check Status
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncMissedNotifications}
            className="flex-1"
          >
            <Bell className="h-3 w-3 mr-2" />
            Sync Missed
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};