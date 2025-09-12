import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Battery, Shield, Bell, Smartphone } from 'lucide-react';

export const BatteryOptimizationGuide: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Only show on Android native platform
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return null;
  }

  if (!isVisible) {
    return (
      <Alert className="mb-4">
        <Bell className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Enable reliable push notifications when phone sleeps</span>
          <Button variant="outline" size="sm" onClick={() => setIsVisible(true)}>
            Setup Guide
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Battery className="h-5 w-5" />
          Battery Optimization Setup
        </CardTitle>
        <CardDescription>
          Follow these steps to ensure you receive push notifications even when your phone is sleeping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Disable Battery Optimization</p>
              <p className="text-sm text-muted-foreground">
                Go to Settings → Apps → ForexAlert Pro → Battery → Optimize battery usage → Turn OFF
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Enable Auto-Start</p>
              <p className="text-sm text-muted-foreground">
                Settings → Apps → ForexAlert Pro → Auto-start → Enable
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Allow Background Activity</p>
              <p className="text-sm text-muted-foreground">
                Settings → Apps → ForexAlert Pro → Battery → Background activity → Allow
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              4
            </div>
            <div>
              <p className="font-medium">Pin App in Recent Apps</p>
              <p className="text-sm text-muted-foreground">
                Open recent apps, find ForexAlert Pro, tap the pin/lock icon
              </p>
            </div>
          </div>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> These settings vary by device manufacturer. Look for similar options in your device's settings.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsVisible(false)}>
            Done
          </Button>
          <Button 
            variant="default" 
            onClick={() => {
              // Open Android settings - would need native bridge
              console.log('📱 Opening Android app settings');
            }}
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Open Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatteryOptimizationGuide;