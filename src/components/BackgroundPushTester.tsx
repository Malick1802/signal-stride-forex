import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Moon, 
  Smartphone, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Battery
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackgroundTest {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  expectedDelivery: Date;
  actualDelivery?: Date;
  message: string;
}

export const BackgroundPushTester: React.FC = () => {
  const [activeTest, setActiveTest] = useState<BackgroundTest | null>(null);
  const [testHistory, setTestHistory] = useState<BackgroundTest[]>([]);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (activeTest && activeTest.status === 'running' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, activeTest]);

  const startBackgroundTest = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Background push testing requires a mobile device');
      return;
    }

    try {
      const testId = `bg_test_${Date.now()}`;
      const now = new Date();
      const deliveryTime = new Date(now.getTime() + 30000); // 30 seconds

      const newTest: BackgroundTest = {
        id: testId,
        status: 'running',
        startTime: now,
        expectedDelivery: deliveryTime,
        message: 'Background delivery test initiated'
      };

      setActiveTest(newTest);
      setCountdown(30);

      // Send push notification via Supabase function
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: 'Background Test - Close App Now',
          body: 'This notification should arrive in 30 seconds. Background your app to test!',
          data: {
            type: 'background_test',
            testId,
            deliveryTime: deliveryTime.toISOString()
          },
          notificationType: 'signal'
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Background test started! Close the app now and wait 30 seconds.');

      // Simulate completion after 30 seconds
      setTimeout(() => {
        const completedTest = {
          ...newTest,
          status: 'completed' as const,
          actualDelivery: new Date(),
          message: 'Test completed - check if notification was received'
        };
        
        setActiveTest(null);
        setTestHistory(prev => [completedTest, ...prev.slice(0, 4)]);
        setCountdown(0);
      }, 30000);

    } catch (error) {
      console.error('Background test failed:', error);
      
      const failedTest: BackgroundTest = {
        id: `failed_${Date.now()}`,
        status: 'failed',
        startTime: new Date(),
        expectedDelivery: new Date(),
        message: `Test failed: ${error}`
      };

      setActiveTest(null);
      setTestHistory(prev => [failedTest, ...prev.slice(0, 4)]);
      toast.error('Background test failed');
    }
  };

  const getStatusIcon = (status: BackgroundTest['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!Capacitor.isNativePlatform()) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Background Push Testing
          </CardTitle>
          <CardDescription>
            Available only on mobile devices
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5" />
          Background Push Testing
        </CardTitle>
        <CardDescription>
          Test notifications when app is backgrounded or phone is sleeping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTest ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(activeTest.status)}
                <span className="font-medium">Background Test Running</span>
              </div>
              <Badge variant="secondary">{countdown}s remaining</Badge>
            </div>
            
            <Progress value={((30 - countdown) / 30) * 100} className="h-2" />
            
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Moon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Close the App Now!
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Press the home button or switch to another app. The notification should arrive in {countdown} seconds.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Test started: {activeTest.startTime.toLocaleTimeString()}</p>
              <p>• Expected delivery: {activeTest.expectedDelivery.toLocaleTimeString()}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              onClick={startBackgroundTest} 
              className="w-full"
              size="lg"
            >
              <Moon className="w-4 h-4 mr-2" />
              Start 30-Second Background Test
            </Button>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <Battery className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">Before testing:</p>
                  <ul className="text-xs ml-4 list-disc space-y-1">
                    <li>Ensure you've completed FCM setup</li>
                    <li>Disable battery optimization for this app</li>
                    <li>Test on a physical device, not emulator</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {testHistory.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Test History</h4>
            {testHistory.map((test) => (
              <div key={test.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  <div>
                    <p className="text-sm font-medium">
                      {test.startTime.toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {test.message}
                    </p>
                  </div>
                </div>
                <Badge variant={
                  test.status === 'completed' ? 'default' : 
                  test.status === 'failed' ? 'destructive' : 'secondary'
                }>
                  {test.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};