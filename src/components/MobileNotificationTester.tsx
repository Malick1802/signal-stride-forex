import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { useMobileNotificationManager } from '@/hooks/useMobileNotificationManager';
import { Capacitor } from '@capacitor/core';

interface MobileNotificationTesterProps {
  onStatusUpdate?: (status: string) => void;
}

export const MobileNotificationTester: React.FC<MobileNotificationTesterProps> = ({ onStatusUpdate }) => {
  const { isRegistered, pushToken, permissionError, initializePushNotifications, sendTestNotification } = usePushNotifications();
  const { sendTestNotification: sendManagedTest } = useMobileNotificationManager();
  const [loading, setLoading] = useState(false);

  const handleLocalTest = async () => {
    setLoading(true);
    onStatusUpdate?.('Testing local notifications...');
    
    try {
      await MobileNotificationManager.testNotification();
      onStatusUpdate?.('✅ Local notification test sent!');
    } catch (error) {
      onStatusUpdate?.(`❌ Local test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePushTest = async () => {
    setLoading(true);
    onStatusUpdate?.('Testing push notifications...');
    
    try {
      await sendTestNotification();
      onStatusUpdate?.('✅ Push notification test sent!');
    } catch (error) {
      onStatusUpdate?.(`❌ Push test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManagedTest = async () => {
    setLoading(true);
    onStatusUpdate?.('Testing managed notifications...');
    
    try {
      await sendManagedTest();
      onStatusUpdate?.('✅ Managed notification test sent!');
    } catch (error) {
      onStatusUpdate?.(`❌ Managed test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInit = async () => {
    setLoading(true);
    onStatusUpdate?.('Initializing push notifications...');
    
    try {
      const success = await initializePushNotifications();
      if (success) {
        onStatusUpdate?.('✅ Push notifications initialized!');
      } else {
        onStatusUpdate?.('❌ Push initialization failed');
      }
    } catch (error) {
      onStatusUpdate?.(`❌ Init failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignalTest = async () => {
    setLoading(true);
    onStatusUpdate?.('Testing signal notifications...');
    
    try {
      await MobileNotificationManager.showInstantSignalNotification(
        '🚀 New Signal Alert',
        'EUR/USD BUY signal generated - Entry: 1.0825, TP: 1.0875, SL: 1.0795',
        { symbol: 'EUR/USD', type: 'BUY', pips: 25 }
      );
      
      // Also test outcome notification
      setTimeout(async () => {
        await MobileNotificationManager.showSignalOutcomeNotification(
          '🎯 Target Hit!',
          'EUR/USD signal reached first target (+25 pips)',
          { symbol: 'EUR/USD', outcome: 'profit', pips: 25 }
        );
      }, 2000);
      
      onStatusUpdate?.('✅ Signal notifications sent!');
    } catch (error) {
      onStatusUpdate?.(`❌ Signal test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!Capacitor.isNativePlatform()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mobile Notification Tester</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Only available on mobile devices</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile Notification Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div>Status: {isRegistered ? '✅ Registered' : '❌ Not registered'}</div>
          <div>Token: {pushToken ? `${pushToken.substring(0, 20)}...` : 'None'}</div>
          {permissionError && <div className="text-red-500">Error: {permissionError}</div>}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button onClick={handleInit} disabled={loading || isRegistered} className="w-full">
            Initialize Push Notifications
          </Button>
          
          <Button onClick={handleLocalTest} disabled={loading} variant="outline" className="w-full">
            Test Local Notification
          </Button>
          
          <Button onClick={handlePushTest} disabled={loading || !isRegistered} variant="outline" className="w-full">
            Test Push Notification
          </Button>
          
          <Button onClick={handleManagedTest} disabled={loading} variant="outline" className="w-full">
            Test Managed Notification
          </Button>
          
          <Button onClick={handleSignalTest} disabled={loading} variant="secondary" className="w-full">
            Test Signal Notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileNotificationTester;