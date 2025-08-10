
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Volume2, Vibrate, AlertCircle, TestTube, Smartphone, Globe, CheckCircle, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useMobileNotificationManager } from '@/hooks/useMobileNotificationManager';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationState {
  isSupported: boolean;
  isNative: boolean;
  platform: string;
  permission: 'default' | 'granted' | 'denied' | 'unsupported';
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  detectedAPIs: {
    hasLocalNotifications: boolean;
    hasWebNotifications: boolean;
    hasPushNotifications: boolean;
  };
}

export const PushNotificationSettings = () => {
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();
  const { sendTestNotification } = useMobileNotificationManager();
  const { isRegistered, initializePushNotifications } = usePushNotifications();
  
  const [notificationState, setNotificationState] = useState<NotificationState>({
    isSupported: false,
    isNative: false,
    platform: 'web',
    permission: 'default',
    isInitialized: false,
    isLoading: true,
    error: null,
    detectedAPIs: {
      hasLocalNotifications: false,
      hasWebNotifications: false,
      hasPushNotifications: false
    }
  });
  
  const [isInitializing, setIsInitializing] = useState(false);

  // Local state for form values
  const [settings, setSettings] = useState({
    push_notifications_enabled: profile?.push_notifications_enabled ?? true,
    push_new_signals: profile?.push_new_signals ?? true,
    push_targets_hit: profile?.push_targets_hit ?? true,
    push_stop_loss: profile?.push_stop_loss ?? true,
    push_signal_complete: profile?.push_signal_complete ?? true,
    push_market_updates: profile?.push_market_updates ?? false,
    push_sound_enabled: profile?.push_sound_enabled ?? true,
    push_vibration_enabled: profile?.push_vibration_enabled ?? true,
  });

  // Initialize notification state with proper API detection
  useEffect(() => {
    const initializeNotificationState = async () => {
      console.log('🔄 Starting notification state initialization...');
      
      try {
        setNotificationState(prev => ({ 
          ...prev, 
          isLoading: true,
          error: null 
        }));

        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform();
        
        console.log('🔍 Platform detection:', { isNative, platform });
        
        // Detect available APIs
        const detectedAPIs = {
          hasLocalNotifications: false,
          hasWebNotifications: false,
          hasPushNotifications: false
        };

        // Check native capabilities first if on native platform
        if (isNative) {
          console.log('📱 Checking native notification capabilities...');
          detectedAPIs.hasLocalNotifications = await MobileNotificationManager.checkNativeNotificationSupport();
          detectedAPIs.hasPushNotifications = await MobileNotificationManager.checkPushNotificationSupport();
          console.log('📱 Native capabilities:', detectedAPIs);
        }

        // Always check web capabilities for fallback
        console.log('🌐 Checking web notification capabilities...');
        detectedAPIs.hasWebNotifications = await MobileNotificationManager.checkWebNotificationSupport();
        if (!isNative) {
          detectedAPIs.hasPushNotifications = await MobileNotificationManager.checkPushNotificationSupport();
        }
        console.log('🌐 Web capabilities:', detectedAPIs);

        // Determine final configuration
        let isSupported = false;
        let permission: 'default' | 'granted' | 'denied' | 'unsupported' = 'unsupported';
        let useNative = false;

        if (detectedAPIs.hasLocalNotifications && isNative) {
          // Native platform with LocalNotifications
          isSupported = true;
          useNative = true;
          permission = 'default';
          console.log('✅ Using native LocalNotifications');
        } else if (detectedAPIs.hasWebNotifications) {
          // Web platform or fallback with browser notifications
          isSupported = true;
          useNative = false;
          permission = Notification.permission as any;
          console.log('✅ Using web notifications, permission:', permission);
        } else {
          console.log('❌ No notification APIs available');
          isSupported = false;
          useNative = false;
          permission = 'unsupported';
        }

        const finalState = {
          isSupported,
          isNative: useNative,
          platform,
          permission,
          isInitialized: false,
          isLoading: false,
          error: null,
          detectedAPIs
        };

        console.log('🎯 Final notification state:', finalState);
        setNotificationState(finalState);

      } catch (error) {
        console.error('❌ Error during notification initialization:', error);
        setNotificationState(prev => ({
          ...prev,
          isLoading: false,
          error: `Initialization failed: ${(error as Error).message}`,
          isSupported: false
        }));
      }
    };

    initializeNotificationState();
  }, []);

  // Update settings when profile changes
  useEffect(() => {
    if (profile) {
      setSettings({
        push_notifications_enabled: profile.push_notifications_enabled ?? true,
        push_new_signals: profile.push_new_signals ?? true,
        push_targets_hit: profile.push_targets_hit ?? true,
        push_stop_loss: profile.push_stop_loss ?? true,
        push_signal_complete: profile.push_signal_complete ?? true,
        push_market_updates: profile.push_market_updates ?? false,
        push_sound_enabled: profile.push_sound_enabled ?? true,
        push_vibration_enabled: profile.push_vibration_enabled ?? true,
      });
    }
  }, [profile]);

  // Reflect native push registration in permission state
  useEffect(() => {
    if (isRegistered) {
      setNotificationState(prev => ({ ...prev, permission: 'granted', isInitialized: true }));
    }
  }, [isRegistered]);

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const payload = {
      ...settings,
      // Keep Edge Function compatibility
      push_enabled: settings.push_notifications_enabled,
    };
    const { error } = await updateProfile(payload);
    if (!error) {
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated.',
      });
    } else {
      toast({
        title: 'Error saving settings',
        description: error.message || 'Failed to save notification settings',
        variant: 'destructive',
      });
    }
  };

  const requestPermission = async () => {
    setIsInitializing(true);
    try {
      console.log('🔔 Requesting push registration (FCM) ...');
      await initializePushNotifications();
      // After registration, treat as granted; the hook will persist token
      setNotificationState(prev => ({ 
        ...prev, 
        permission: 'granted',
        isInitialized: true 
      }));
      toast({
        title: 'Notifications enabled',
        description: notificationState.isNative ? 
          'Native push notifications are active.' : 
          'Browser notifications are active.',
      });
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      setNotificationState(prev => ({ ...prev, permission: 'denied' }));
      toast({
        title: 'Permission error',
        description: `Failed to enable notifications: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      console.log('🧪 Sending test notification...');
      
      if (notificationState.permission === 'granted') {
        await MobileNotificationManager.testNotification();
        toast({
          title: 'Test sent',
          description: 'Check if you received the test notification.',
        });
      } else {
        toast({
          title: 'Cannot send test',
          description: 'Notifications must be enabled first.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      toast({
        title: 'Test failed',
        description: `Could not send test notification: ${(error as Error).message}`,
        variant: 'destructive',
      });
    }
  };

  const getPermissionBadge = () => {
    switch (notificationState.permission) {
      case 'granted':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Enabled
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Blocked
          </Badge>
        );
      case 'unsupported':
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Not Supported
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Bell className="w-3 h-3 mr-1" />
            Setup Required
          </Badge>
        );
    }
  };

  const canSendNotifications = () => {
    return isRegistered || notificationState.permission === 'granted';
  };

  const needsPermission = () => {
    return (notificationState.permission === 'default' || notificationState.permission === 'denied') && notificationState.isSupported;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading notification settings...</div>;
  }

  if (notificationState.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-muted-foreground">Checking notification capabilities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info - Always show for troubleshooting */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700 text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-600 text-xs space-y-1">
            <div><strong>Loading:</strong> {notificationState.isLoading ? 'Yes' : 'No'}</div>
            <div><strong>Supported:</strong> {notificationState.isSupported ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Platform:</strong> {notificationState.platform}</div>
            <div><strong>Native:</strong> {notificationState.isNative ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Permission:</strong> {notificationState.permission}</div>
            <div><strong>Local Notifications:</strong> {notificationState.detectedAPIs.hasLocalNotifications ? '✅' : '❌'}</div>
            <div><strong>Web Notifications:</strong> {notificationState.detectedAPIs.hasWebNotifications ? '✅' : '❌'}</div>
            <div><strong>Push Notifications:</strong> {notificationState.detectedAPIs.hasPushNotifications ? '✅' : '❌'}</div>
            {notificationState.error && <div className="text-red-600"><strong>Error:</strong> {notificationState.error}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Platform & Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {notificationState.isNative ? <Smartphone className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
              <span>Notification Status</span>
            </div>
            {getPermissionBadge()}
          </CardTitle>
          <CardDescription>
            {notificationState.isNative 
              ? `Mobile app with native notifications - ${notificationState.detectedAPIs.hasLocalNotifications ? 'LocalNotifications available' : 'native notifications not available'}`
              : `Web browser - ${notificationState.detectedAPIs.hasWebNotifications ? 'browser notifications available' : 'notifications not supported'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unsupported Platform */}
          {!notificationState.isSupported && (
            <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
              <p className="text-orange-700 text-sm font-medium">
                Notifications Not Available
              </p>
              <p className="text-orange-600 text-xs mt-1">
                No notification APIs are available. Please use a modern browser or install the mobile app.
              </p>
            </div>
          )}

          {/* Permission Error */}
          {notificationState.permission === 'denied' && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-red-700 text-sm font-medium">
                Notifications Blocked
              </p>
              <p className="text-red-600 text-xs mt-1">
                {notificationState.isNative 
                  ? 'Go to your device Settings → Apps → ForexSignal Pro → Notifications → Allow'
                  : 'Go to your browser settings → Site permissions → Notifications → Allow for this site'
                }
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            {needsPermission() && (
              <Button 
                onClick={requestPermission} 
                className="flex-1"
                disabled={isInitializing}
              >
                <Bell className="w-4 h-4 mr-2" />
                {isInitializing ? 'Setting up...' : 'Enable Notifications'}
              </Button>
            )}

            {canSendNotifications() && (
              <Button 
                onClick={handleTestNotification} 
                variant="outline" 
                className="flex-1"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test Notification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences - Show if notifications are supported */}
      {notificationState.isSupported && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose what types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Switch */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="font-medium">Enable Push Notifications</div>
                <div className="text-sm text-muted-foreground">
                  Master switch for all push notifications
                </div>
              </div>
              <Switch
                checked={settings.push_notifications_enabled}
                onCheckedChange={(value) => {
                  handleSettingChange('push_notifications_enabled', value);
                  if (value) requestPermission();
                }}
              />
            </div>

            {/* Individual Settings */}
            {settings.push_notifications_enabled && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">New Trading Signals</div>
                      <div className="text-sm text-muted-foreground">
                        Get notified when new signals are generated
                      </div>
                    </div>
                    <Switch
                      checked={settings.push_new_signals}
                      onCheckedChange={(value) => handleSettingChange('push_new_signals', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">Target Hits</div>
                      <div className="text-sm text-muted-foreground">
                        Notifications when take profit targets are reached
                      </div>
                    </div>
                    <Switch
                      checked={settings.push_targets_hit}
                      onCheckedChange={(value) => handleSettingChange('push_targets_hit', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">Stop Loss Alerts</div>
                      <div className="text-sm text-muted-foreground">
                        Get alerted when stop loss levels are triggered
                      </div>
                    </div>
                    <Switch
                      checked={settings.push_stop_loss}
                      onCheckedChange={(value) => handleSettingChange('push_stop_loss', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">Signal Completion</div>
                      <div className="text-sm text-muted-foreground">
                        Notifications when signals expire or close
                      </div>
                    </div>
                    <Switch
                      checked={settings.push_signal_complete}
                      onCheckedChange={(value) => handleSettingChange('push_signal_complete', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">Market Updates</div>
                      <div className="text-sm text-muted-foreground">
                        General market news and important updates
                      </div>
                    </div>
                    <Switch
                      checked={settings.push_market_updates}
                      onCheckedChange={(value) => handleSettingChange('push_market_updates', value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sound & Vibration Settings */}
      {settings.push_notifications_enabled && canSendNotifications() && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Style</CardTitle>
            <CardDescription>
              Customize how notifications are presented
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-1">
                  <div className="font-medium">Sound</div>
                  <div className="text-sm text-muted-foreground">
                    Play notification sounds
                  </div>
                </div>
              </div>
              <Switch
                checked={settings.push_sound_enabled}
                onCheckedChange={(value) => handleSettingChange('push_sound_enabled', value)}
              />
            </div>

            {notificationState.isNative && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Vibrate className="w-4 h-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <div className="font-medium">Vibration</div>
                    <div className="text-sm text-muted-foreground">
                      Vibrate device on notifications
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.push_vibration_enabled}
                  onCheckedChange={(value) => handleSettingChange('push_vibration_enabled', value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="pt-4">
        <Button onClick={handleSave} className="w-full" size="lg">
          Save Notification Settings
        </Button>
      </div>
    </div>
  );
};
