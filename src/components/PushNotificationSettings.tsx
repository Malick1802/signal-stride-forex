
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Volume2, Vibrate, AlertCircle, TestTube, Smartphone, Globe, CheckCircle } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useMobileNotificationManager } from '@/hooks/useMobileNotificationManager';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { Capacitor } from '@capacitor/core';

interface NotificationState {
  isSupported: boolean;
  isNative: boolean;
  platform: string;
  permission: 'default' | 'granted' | 'denied' | 'unsupported';
  isInitialized: boolean;
}

export const PushNotificationSettings = () => {
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();
  const { sendTestNotification } = useMobileNotificationManager();
  
  const [notificationState, setNotificationState] = useState<NotificationState>({
    isSupported: false,
    isNative: false,
    platform: 'web',
    permission: 'default',
    isInitialized: false
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

  // Initialize notification state
  useEffect(() => {
    const initializeNotificationState = () => {
      const isNative = Capacitor.isNativePlatform();
      const platform = isNative ? Capacitor.getPlatform() : 'web';
      
      let isSupported = false;
      let permission: 'default' | 'granted' | 'denied' | 'unsupported' = 'unsupported';
      
      if (isNative) {
        isSupported = true;
        permission = 'default'; // We'll check actual permission later
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        isSupported = true;
        permission = Notification.permission as any;
      }

      setNotificationState({
        isSupported,
        isNative,
        platform,
        permission,
        isInitialized: false
      });

      console.log('🔍 Notification State Initialized:', {
        isSupported,
        isNative,
        platform,
        permission
      });
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

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const { error } = await updateProfile(settings);
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
      console.log('🔔 Requesting notification permissions...');
      
      if (notificationState.isNative) {
        // Mobile app permissions
        console.log('📱 Initializing mobile notifications...');
        const success = await MobileNotificationManager.initialize();
        
        if (success) {
          setNotificationState(prev => ({ 
            ...prev, 
            permission: 'granted',
            isInitialized: true 
          }));
          
          toast({
            title: 'Mobile notifications enabled',
            description: 'Push notifications are now active for the mobile app.',
          });
        } else {
          throw new Error('Failed to initialize mobile notifications');
        }
      } else if (notificationState.isSupported) {
        // Web browser permissions
        console.log('🌐 Requesting browser notification permission...');
        const permission = await Notification.requestPermission();
        
        setNotificationState(prev => ({ 
          ...prev, 
          permission: permission as any 
        }));
        
        if (permission === 'granted') {
          await MobileNotificationManager.initialize();
          setNotificationState(prev => ({ 
            ...prev, 
            isInitialized: true 
          }));
          
          toast({
            title: 'Notifications enabled',
            description: 'Browser notifications are now active.',
          });
        } else {
          toast({
            title: 'Permission denied',
            description: 'Please enable notifications in your browser settings.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Not supported',
          description: 'Notifications are not supported on this platform.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
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
    return notificationState.permission === 'granted' && notificationState.isInitialized;
  };

  const needsPermission = () => {
    return notificationState.permission === 'default' && notificationState.isSupported;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading notification settings...</div>;
  }

  return (
    <div className="space-y-6">
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
              ? `Mobile app on ${notificationState.platform} - native push notifications available`
              : `Web browser - ${notificationState.isSupported ? 'browser notifications available' : 'notifications not supported'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Error */}
          {notificationState.permission === 'denied' && (
            <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
              <p className="text-orange-700 text-sm">
                <strong>Notifications Blocked:</strong> You've previously denied notification permissions.
              </p>
              <p className="text-orange-600 text-xs mt-1">
                To enable: Go to your browser settings → Site permissions → Notifications → Allow for this site
              </p>
            </div>
          )}

          {/* Unsupported Platform */}
          {notificationState.permission === 'unsupported' && (
            <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg">
              <p className="text-gray-700 text-sm">
                <strong>Not Supported:</strong> Your browser doesn't support notifications.
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Try using Chrome, Firefox, or Safari for the best experience.
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

      {/* Notification Preferences - Only show if notifications are supported */}
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
                onCheckedChange={(value) => handleSettingChange('push_notifications_enabled', value)}
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
