import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, RefreshCw, Bell, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { MobileNotificationManager } from '@/utils/mobileNotifications';
import { EnhancedMobileNotificationManager } from '@/utils/enhancedMobileNotifications';

export const AdminSoundTester: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{
    type: string;
    status: 'success' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (type: string, status: 'success' | 'error' | 'info', message: string) => {
    setTestResults(prev => [{
      type,
      status,
      message,
      timestamp: new Date()
    }, ...prev.slice(0, 9)]); // Keep only last 10 results
    console.log(`[${type}] ${status}: ${message}`);
  };

  const testDirectSoundPlayback = async () => {
    setIsLoading(true);
    addTestResult('Direct Sound', 'info', 'Testing direct sound playback...');

    try {
      if (!Capacitor.isNativePlatform()) {
        addTestResult('Direct Sound', 'error', 'Direct sound testing only available on native platforms');
        return;
      }

      // Test direct sound playback via local notification with minimal delay
      const testId = Math.floor(Date.now() / 1000);
      
      await LocalNotifications.schedule({
        notifications: [{
          id: testId,
          title: '🔊 Sound Test',
          body: 'Testing custom notification sound',
          schedule: { at: new Date(Date.now() + 100) }, // 100ms delay
          sound: 'coin_notification',
          channelId: 'forex_signals_v3',
          extra: { test: true }
        }]
      });

      addTestResult('Direct Sound', 'success', 'Sound test notification scheduled');
    } catch (error) {
      addTestResult('Direct Sound', 'error', `Failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const recreateNotificationChannels = async () => {
    setIsLoading(true);
    addTestResult('Channels', 'info', 'Recreating notification channels with v3 IDs...');

    try {
      if (!Capacitor.isNativePlatform()) {
        addTestResult('Channels', 'error', 'Channel recreation only available on native platforms');
        return;
      }

      // First delete old channels if they exist (this might not work on some Android versions)
      try {
        await LocalNotifications.deleteChannel({ id: 'forex_signals_v2' });
        await LocalNotifications.deleteChannel({ id: 'trade_alerts_v2' });
        await LocalNotifications.deleteChannel({ id: 'market_updates_v2' });
        addTestResult('Channels', 'info', 'Old v2 channels deletion attempted');
      } catch (e) {
        addTestResult('Channels', 'info', 'Old channels may not exist or deletion not supported');
      }

      // Create new v3 channels with correct sound
      await MobileNotificationManager.setupNotificationChannels();
      await EnhancedMobileNotificationManager.configureHighPriorityNotifications();
      
      addTestResult('Channels', 'success', 'V3 notification channels created with coin_notification sound');
    } catch (error) {
      addTestResult('Channels', 'error', `Failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testNotificationWithNewChannel = async () => {
    setIsLoading(true);
    addTestResult('New Channel Test', 'info', 'Testing notification with v3 channel...');

    try {
      if (!Capacitor.isNativePlatform()) {
        addTestResult('New Channel Test', 'error', 'Channel testing only available on native platforms');
        return;
      }

      // Send test notification using v3 channel
      await MobileNotificationManager.showInstantSignalNotification(
        '🎵 V3 Channel Test',
        'Testing new v3 channel with custom sound',
        { test: true, channel_version: 'v3' }
      );

      addTestResult('New Channel Test', 'success', 'V3 channel test notification sent');
    } catch (error) {
      addTestResult('New Channel Test', 'error', `Failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullSoundDiagnostic = async () => {
    setIsLoading(true);
    setTestResults([]); // Clear previous results
    
    addTestResult('Full Diagnostic', 'info', 'Starting comprehensive sound diagnostic...');

    try {
      // Step 1: Check platform
      if (!Capacitor.isNativePlatform()) {
        addTestResult('Platform Check', 'error', 'Not on native platform - sound testing limited');
        return;
      }
      addTestResult('Platform Check', 'success', `Running on ${Capacitor.getPlatform()}`);

      // Step 2: Check permissions
      try {
        const permissions = await LocalNotifications.checkPermissions();
        addTestResult('Permissions', permissions.display === 'granted' ? 'success' : 'error', 
          `Display: ${permissions.display}`);
      } catch (e) {
        addTestResult('Permissions', 'error', `Permission check failed: ${e}`);
      }

      // Step 3: Recreate channels
      await new Promise(resolve => setTimeout(resolve, 500));
      await recreateNotificationChannels();

      // Step 4: Test direct sound
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testDirectSoundPlayback();

      // Step 5: Test notification with new channel
      await new Promise(resolve => setTimeout(resolve, 1000));
      await testNotificationWithNewChannel();

      addTestResult('Full Diagnostic', 'success', 'Comprehensive diagnostic completed');
    } catch (error) {
      addTestResult('Full Diagnostic', 'error', `Diagnostic failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!Capacitor.isNativePlatform()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Sound Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Sound testing is only available on mobile devices</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Admin Sound Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={testDirectSoundPlayback} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Test Sound
          </Button>
          
          <Button 
            onClick={recreateNotificationChannels} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recreate Channels
          </Button>
          
          <Button 
            onClick={testNotificationWithNewChannel} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            Test V3 Channel
          </Button>
          
          <Button 
            onClick={runFullSoundDiagnostic} 
            disabled={isLoading}
            variant="default"
            className="w-full"
          >
            Run Full Test
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-medium">Test Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    result.status === 'success' ? 'default' : 
                    result.status === 'error' ? 'destructive' : 'secondary'
                  }>
                    {result.type}
                  </Badge>
                  <span className="truncate">{result.message}</span>
                </div>
                <span className="text-muted-foreground">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
          <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Instructions:</div>
          <div className="text-blue-700 dark:text-blue-200 space-y-1">
            <div>1. Use "Recreate Channels" to force new v3 channels</div>
            <div>2. Use "Test Sound" to verify custom sound playback</div>
            <div>3. Use "Run Full Test" for comprehensive diagnosis</div>
            <div>4. After changes, uninstall app and run `npx cap sync`</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSoundTester;