import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMobileNotificationManager } from '@/hooks/useMobileNotificationManager';
import { useProfile } from '@/hooks/useProfile';
import { Capacitor } from '@capacitor/core';

export const PushNotificationDebugger = () => {
  const { isRegistered, pushToken, permissionError, initializePushNotifications, sendTestNotification } = usePushNotifications();
  const { sendTestNotification: sendMobileTest } = useMobileNotificationManager();
  const { profile } = useProfile();

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📱 Push Notification Debugger
          <Badge variant={isRegistered ? "default" : "secondary"}>
            {isRegistered ? "Registered" : "Not Registered"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test and debug push notification functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Platform</p>
            <p className="text-sm text-muted-foreground">{platform}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Native App</p>
            <p className="text-sm text-muted-foreground">{isNative ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* Push Token Status */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Push Token Status</p>
          {pushToken ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-mono break-all">
                {pushToken.substring(0, 50)}...
              </p>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">No push token available</p>
            </div>
          )}
        </div>

        {/* Profile Settings */}
        {profile && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Notification Preferences</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Push Enabled:</span>
                <Badge variant={profile.push_enabled ? "default" : "secondary"}>
                  {profile.push_enabled ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>New Signals:</span>
                <Badge variant={profile.push_new_signals ? "default" : "secondary"}>
                  {profile.push_new_signals ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Target Hits:</span>
                <Badge variant={profile.push_targets_hit ? "default" : "secondary"}>
                  {profile.push_targets_hit ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Stop Loss:</span>
                <Badge variant={profile.push_stop_loss ? "default" : "secondary"}>
                  {profile.push_stop_loss ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {permissionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{permissionError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isRegistered && (
            <Button onClick={initializePushNotifications} variant="default">
              Initialize Push Notifications
            </Button>
          )}
          
          {isRegistered && (
            <>
              <Button onClick={sendTestNotification} variant="outline">
                Test Backend Push
              </Button>
              <Button onClick={sendMobileTest} variant="outline">
                Test Mobile Notification
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong>
            {!isNative ? (
              " Push notifications require a native mobile app. This web version only shows debugging info."
            ) : !isRegistered ? (
              " Click 'Initialize Push Notifications' to register for push notifications."
            ) : (
              " Your device is registered! Use the test buttons to verify functionality."
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};