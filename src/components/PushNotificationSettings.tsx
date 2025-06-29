
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Volume2, Vibrate, AlertCircle } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Capacitor } from '@capacitor/core';

export const PushNotificationSettings = () => {
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();
  const { isRegistered, initializePushNotifications } = usePushNotifications();
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');

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

  useEffect(() => {
    // Check notification permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const { error } = await updateProfile(settings);
    if (!error) {
      toast({
        title: 'Notification settings updated',
        description: 'Your push notification preferences have been saved.',
      });
    } else {
      toast({
        title: 'Error updating settings',
        description: error.message || 'Failed to save notification settings',
        variant: 'destructive',
      });
    }
  };

  const requestPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      // On mobile, use Capacitor's push notification initialization
      await initializePushNotifications();
    } else if ('Notification' in window) {
      // On web, request browser notification permission
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
    }
  };

  const getPermissionBadge = () => {
    if (Capacitor.isNativePlatform()) {
      return isRegistered ? (
        <Badge variant="default" className="bg-green-500">
          <Bell className="w-3 h-3 mr-1" />
          Enabled
        </Badge>
      ) : (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Disabled
        </Badge>
      );
    } else {
      switch (permissionStatus) {
        case 'granted':
          return (
            <Badge variant="default" className="bg-green-500">
              <Bell className="w-3 h-3 mr-1" />
              Granted
            </Badge>
          );
        case 'denied':
          return (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Denied
            </Badge>
          );
        default:
          return (
            <Badge variant="secondary">
              <AlertCircle className="w-3 h-3 mr-1" />
              Not Set
            </Badge>
          );
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading notification settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Push Notification Status
            {getPermissionBadge()}
          </CardTitle>
          <CardDescription>
            {Capacitor.isNativePlatform() 
              ? "Manage your mobile push notification permissions"
              : "Browser notification permissions are required to receive push notifications"
            }
          </CardDescription>
        </CardHeader>
        {(!isRegistered && Capacitor.isNativePlatform()) || (permissionStatus !== 'granted' && !Capacitor.isNativePlatform()) ? (
          <CardContent>
            <Button onClick={requestPermission} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Enable Push Notifications
            </Button>
          </CardContent>
        ) : null}
      </Card>

      {/* Main Settings */}
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

      {/* Sound & Vibration Settings */}
      {settings.push_notifications_enabled && (
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
