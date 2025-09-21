import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  Smartphone,
  Server,
  Zap
} from 'lucide-react';

interface StatusItem {
  label: string;
  status: 'success' | 'warning' | 'error' | 'loading';
  message: string;
}

export const PushNotificationStatusCenter: React.FC = () => {
  const { user } = useAuth();
  const { isRegistered, pushToken, initializePushNotifications } = usePushNotifications();
  const [testing, setTesting] = useState(false);
  const [reviving, setReviving] = useState(false);
  const [statusItems, setStatusItems] = useState<StatusItem[]>([]);
  const [lastTest, setLastTest] = useState<Date | null>(null);

  const updateStatus = (updates: Partial<StatusItem>[]) => {
    setStatusItems(prev => {
      const newItems = [...prev];
      updates.forEach(update => {
        const index = newItems.findIndex(item => item.label === update.label);
        if (index >= 0) {
          newItems[index] = { ...newItems[index], ...update };
        } else if (update.label) {
          newItems.push(update as StatusItem);
        }
      });
      return newItems;
    });
  };

  const checkPushStatus = async () => {
    if (!user) return;

    updateStatus([
      { label: 'Platform Check', status: 'loading', message: 'Checking platform...' },
      { label: 'Token Registration', status: 'loading', message: 'Checking token...' },
      { label: 'Database Sync', status: 'loading', message: 'Checking database...' }
    ]);

    // Check 1: Platform compatibility
    const isNative = Capacitor.isNativePlatform();
    updateStatus([{
      label: 'Platform Check',
      status: isNative ? 'success' : 'error',
      message: isNative ? 'Native platform detected' : 'Web platform - push notifications limited'
    }]);

    // Check 2: Token registration
    updateStatus([{
      label: 'Token Registration',
      status: isRegistered && pushToken ? 'success' : 'error',
      message: isRegistered && pushToken ? 
        `Token registered (${pushToken.substring(0, 20)}...)` : 
        'Push token not registered'
    }]);

    // Check 3: Database sync
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('push_token, push_enabled, device_type')
        .eq('id', user.id)
        .single();

      if (error) {
        updateStatus([{
          label: 'Database Sync',
          status: 'error',
          message: 'Database check failed'
        }]);
      } else {
        const dbMatches = profile?.push_token === pushToken;
        updateStatus([{
          label: 'Database Sync',
          status: dbMatches ? 'success' : 'warning',
          message: dbMatches ? 'Database token matches' : 'Database token mismatch'
        }]);
      }
    } catch (error) {
      updateStatus([{
        label: 'Database Sync',
        status: 'error',
        message: 'Database query failed'
      }]);
    }
  };

  const testPushNotification = async () => {
    if (!user || !isRegistered || !pushToken) {
      toast.error('Push notifications not set up properly');
      return;
    }

    setTesting(true);
    updateStatus([{
      label: 'FCM Test',
      status: 'loading',
      message: 'Sending test notification...'
    }]);

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: '🧪 Push Test Success',
          body: 'Your push notifications are working perfectly!',
          data: { 
            test: true, 
            timestamp: Date.now(),
            type: 'test'
          },
          notificationType: 'signal',
          userIds: [user.id]
        }
      });

      if (error) {
        console.error('❌ Push test failed:', error);
        updateStatus([{
          label: 'FCM Test',
          status: 'error',
          message: `Test failed: ${error.message}`
        }]);
        toast.error(`Push test failed: ${error.message}`);
      } else {
        console.log('✅ Push test sent:', data);
        updateStatus([{
          label: 'FCM Test',
          status: 'success',
          message: `Test sent successfully (${data?.sent || 0} notifications)`
        }]);
        toast.success('Push notification test sent! Check your device.');
        setLastTest(new Date());
      }
    } catch (error) {
      console.error('❌ Push test error:', error);
      updateStatus([{
        label: 'FCM Test',
        status: 'error',
        message: `Test failed: ${error}`
      }]);
      toast.error(`Test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const revivePushNotifications = async () => {
    setReviving(true);
    updateStatus([{
      label: 'Revival Process',
      status: 'loading',
      message: 'Attempting to revive push notifications...'
    }]);

    try {
      const success = await initializePushNotifications();
      
      if (success) {
        updateStatus([{
          label: 'Revival Process',
          status: 'success',
          message: 'Push notifications revived successfully'
        }]);
        toast.success('Push notifications restored');
        // Recheck status after revival
        setTimeout(checkPushStatus, 1000);
      } else {
        updateStatus([{
          label: 'Revival Process',
          status: 'error',
          message: 'Failed to revive push notifications'
        }]);
        toast.error('Failed to revive push notifications');
      }
    } catch (error) {
      console.error('❌ Revival error:', error);
      updateStatus([{
        label: 'Revival Process',
        status: 'error',
        message: `Revival failed: ${error}`
      }]);
      toast.error(`Revival failed: ${error}`);
    } finally {
      setReviving(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkPushStatus();
    }
  }, [user, isRegistered, pushToken]);

  const getStatusIcon = (status: StatusItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: StatusItem['status']) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive',
      loading: 'outline'
    } as const;

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please log in to check push notification status</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notification Status Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status Check</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="space-y-3">
              {statusItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>

            <Button onClick={checkPushStatus} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid gap-3">
              <Button 
                onClick={testPushNotification}
                disabled={testing || !isRegistered}
                className="w-full"
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {testing ? 'Testing...' : 'Send Test Notification'}
              </Button>

              <Button 
                onClick={revivePushNotifications}
                disabled={reviving}
                variant="outline"
                className="w-full"
              >
                {reviving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                {reviving ? 'Reviving...' : 'Revive Push Notifications'}
              </Button>
            </div>

            <Separator />

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Platform: {Capacitor.isNativePlatform() ? 'Native' : 'Web'}
              </p>
              <p className="text-sm text-muted-foreground">
                Token Status: {isRegistered ? 'Registered' : 'Not Registered'}
              </p>
              {lastTest && (
                <p className="text-sm text-muted-foreground">
                  Last Test: {lastTest.toLocaleTimeString()}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PushNotificationStatusCenter;