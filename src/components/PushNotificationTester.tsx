import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Bell, TestTube, CheckCircle, XCircle, Clock } from 'lucide-react';
import { EnhancedMobileNotificationManager } from '@/utils/enhancedMobileNotifications';
import { toast } from 'sonner';

interface TestResult {
  type: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

export const PushNotificationTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingBackground, setIsTestingBackground] = useState(false);

  const addTestResult = (type: string, status: 'pending' | 'success' | 'error', message: string) => {
    const result: TestResult = {
      type,
      status,
      message,
      timestamp: new Date()
    };
    setTestResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
  };

  const testInstantNotification = async () => {
    try {
      await EnhancedMobileNotificationManager.showCriticalSignalNotification(
        'Test Signal Alert',
        'This is a test notification to verify instant delivery',
        { test: true, timestamp: Date.now() }
      );
      addTestResult('Instant', 'success', 'Notification sent successfully');
      toast.success('Test notification sent!');
    } catch (error) {
      addTestResult('Instant', 'error', `Failed: ${error}`);
      toast.error('Test notification failed');
    }
  };

  const testBackgroundDelivery = async () => {
    setIsTestingBackground(true);
    
    try {
      // Send a notification that should be delivered after 10 seconds
      // This simulates background delivery
      setTimeout(async () => {
        try {
          await EnhancedMobileNotificationManager.showUrgentTradeAlert(
            'Background Test Alert',
            'This notification was delivered while app was in background',
            { backgroundTest: true, timestamp: Date.now() }
          );
          addTestResult('Background', 'success', 'Background notification delivered');
          setIsTestingBackground(false);
        } catch (error) {
          addTestResult('Background', 'error', `Background delivery failed: ${error}`);
          setIsTestingBackground(false);
        }
      }, 10000);

      addTestResult('Background', 'pending', 'Background test scheduled for 10 seconds');
      toast.info('Background test will trigger in 10 seconds. You can close/background the app now.');
      
    } catch (error) {
      addTestResult('Background', 'error', `Setup failed: ${error}`);
      setIsTestingBackground(false);
    }
  };

  const testHighPriorityChannel = async () => {
    try {
      await EnhancedMobileNotificationManager.configureHighPriorityNotifications();
      addTestResult('Channel', 'success', 'High-priority channels configured');
      toast.success('High-priority channels set up!');
    } catch (error) {
      addTestResult('Channel', 'error', `Channel setup failed: ${error}`);
      toast.error('Channel setup failed');
    }
  };

  // Only show on native platforms
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Push Notification Testing
        </CardTitle>
        <CardDescription>
          Test different notification scenarios to ensure proper delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={testInstantNotification} variant="outline" className="justify-start">
            <Bell className="w-4 h-4 mr-2" />
            Test Instant Notification
          </Button>
          
          <Button 
            onClick={testBackgroundDelivery} 
            variant="outline" 
            className="justify-start"
            disabled={isTestingBackground}
          >
            <Clock className="w-4 h-4 mr-2" />
            {isTestingBackground ? 'Background Test Running...' : 'Test Background Delivery (10s)'}
          </Button>
          
          <Button onClick={testHighPriorityChannel} variant="outline" className="justify-start">
            <CheckCircle className="w-4 h-4 mr-2" />
            Setup High-Priority Channels
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Test Results</h4>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {result.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {result.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  {result.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                  <span className="text-sm font-medium">{result.type}</span>
                </div>
                <div className="text-right">
                  <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                    {result.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PushNotificationTester;