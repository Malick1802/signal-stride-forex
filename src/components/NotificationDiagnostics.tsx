import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Smartphone, 
  Bell, 
  Wifi, 
  Battery,
  Zap,
  Settings,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { getPlatformInfo } from '@/utils/platformDetection';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMobileNotificationDebugger } from '@/hooks/useMobileNotificationDebugger';

interface DiagnosticTest {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  action?: string;
  critical: boolean;
}

interface NotificationStats {
  totalSent: number;
  deliveryRate: number;
  lastDelivered: Date | null;
  commonIssues: string[];
}

export const NotificationDiagnostics: React.FC = () => {
  const { toast } = useToast();
  const { isRegistered, pushToken } = usePushNotifications();
  const { 
    testResults, 
    isRunningTest, 
    runFullDiagnostic,
    testPermissions,
    testTokenGeneration,
    testLocalNotification 
  } = useMobileNotificationDebugger();

  const [diagnosticTests, setDiagnosticTests] = useState<DiagnosticTest[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    totalSent: 0,
    deliveryRate: 0,
    lastDelivered: null,
    commonIssues: []
  });

  const platformInfo = getPlatformInfo();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    const tests: DiagnosticTest[] = [];

    try {
      // Platform Detection
      tests.push({
        name: 'Platform Detection',
        status: platformInfo.isNative ? 'pass' : 'warning',
        message: platformInfo.isNative 
          ? `Native ${platformInfo.isAndroid ? 'Android' : 'iOS'} platform detected`
          : 'Web platform - limited notification capabilities',
        critical: false
      });

      // Network Connectivity
      const isOnline = navigator.onLine;
      tests.push({
        name: 'Network Connectivity',
        status: isOnline ? 'pass' : 'fail',
        message: isOnline ? 'Device is online' : 'No network connection detected',
        action: !isOnline ? 'Check your internet connection' : undefined,
        critical: true
      });

      // Push Registration
      tests.push({
        name: 'Push Registration',
        status: isRegistered ? 'pass' : 'warning',
        message: isRegistered ? 'Push notifications are registered' : 'Push notifications not registered',
        action: !isRegistered ? 'Enable push notifications in settings' : undefined,
        critical: true
      });

      // FCM Token
      tests.push({
        name: 'FCM Token',
        status: pushToken ? 'pass' : 'fail',
        message: pushToken ? 'Valid FCM token available' : 'No FCM token found',
        action: !pushToken ? 'Reinitialize push notifications' : undefined,
        critical: true
      });

      // Battery Optimization (Android)
      if (platformInfo.isAndroid && platformInfo.isNative) {
        tests.push({
          name: 'Battery Optimization',
          status: 'warning',
          message: 'Battery optimization status unknown - requires manual check',
          action: 'Disable battery optimization for this app',
          critical: true
        });

        tests.push({
          name: 'Background App Refresh',
          status: 'warning',
          message: 'Background refresh status unknown - requires manual check',
          action: 'Enable background app refresh',
          critical: true
        });
      }

      // Notification Permissions
      if (platformInfo.isNative) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const permissions = await LocalNotifications.checkPermissions();
          tests.push({
            name: 'Local Notification Permissions',
            status: permissions.display === 'granted' ? 'pass' : 'fail',
            message: `Local notifications: ${permissions.display}`,
            action: permissions.display !== 'granted' ? 'Grant notification permissions' : undefined,
            critical: true
          });
        } catch (error) {
          tests.push({
            name: 'Local Notification Permissions',
            status: 'fail',
            message: 'Unable to check local notification permissions',
            critical: false
          });
        }
      } else {
        tests.push({
          name: 'Browser Notification Permissions',
          status: Notification.permission === 'granted' ? 'pass' : 'warning',
          message: `Browser notifications: ${Notification.permission}`,
          action: Notification.permission !== 'granted' ? 'Enable browser notifications' : undefined,
          critical: true
        });
      }

      // Service Worker (Web)
      if (!platformInfo.isNative && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        tests.push({
          name: 'Service Worker',
          status: registration ? 'pass' : 'warning',
          message: registration ? 'Service worker registered' : 'No service worker found',
          critical: false
        });
      }

      setDiagnosticTests(tests);

    } catch (error) {
      console.error('Diagnostic test failed:', error);
      toast({
        title: 'Diagnostic Error',
        description: 'Some diagnostic tests failed to run',
        variant: 'destructive'
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const runQuickTest = async () => {
    try {
      await testLocalNotification();
      toast({
        title: 'Test Sent',
        description: 'Check if you received the test notification',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Could not send test notification',
        variant: 'destructive'
      });
    }
  };

  const getOverallHealthScore = () => {
    const criticalTests = diagnosticTests.filter(test => test.critical);
    const passedCritical = criticalTests.filter(test => test.status === 'pass').length;
    const totalCritical = criticalTests.length;
    
    if (totalCritical === 0) return 100;
    return Math.round((passedCritical / totalCritical) * 100);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const healthScore = getOverallHealthScore();

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Notification Health
            </div>
            <Badge variant={healthScore >= 80 ? "default" : healthScore >= 60 ? "secondary" : "destructive"}>
              {healthScore}% Healthy
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time diagnostics of your notification system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Health Score</span>
                <span className={getHealthColor(healthScore)}>{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {diagnosticTests.filter(t => t.status === 'pass').length}
                </div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {diagnosticTests.filter(t => t.status === 'warning').length}
                </div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {diagnosticTests.filter(t => t.status === 'fail').length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {diagnosticTests.filter(t => t.critical).length}
                </div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="diagnostics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="tests">Debug Tests</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">System Diagnostics</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runDiagnostics}
                disabled={isRunningDiagnostics}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {diagnosticTests.map((test, index) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      test.status === 'pass' ? 'bg-green-50 border-green-200' :
                      test.status === 'fail' ? 'bg-red-50 border-red-200' :
                      test.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{test.name}</h4>
                        {test.critical && (
                          <Badge variant="secondary" className="text-xs">Critical</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{test.message}</p>
                      {test.action && (
                        <p className="text-xs text-blue-600 mt-1">→ {test.action}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={runQuickTest} size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Quick Test
                </Button>
                <Button variant="outline" onClick={runFullDiagnostic} size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Full Diagnostic
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Test Results</CardTitle>
              <CardDescription>
                Detailed test results from notification debugging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No test results yet. Run a diagnostic test.</p>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className="text-xs p-2 rounded border">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{result.test}</span>
                        <Badge 
                          variant={result.result === 'success' ? 'default' : result.result === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {result.result}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{result.message}</p>
                      <p className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Notification Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{notificationStats.totalSent}</div>
                  <div className="text-sm text-muted-foreground">Total Sent</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{notificationStats.deliveryRate}%</div>
                  <div className="text-sm text-muted-foreground">Delivery Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {notificationStats.lastDelivered ? 
                      notificationStats.lastDelivered.toLocaleDateString() : 'N/A'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Last Delivered</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{notificationStats.commonIssues.length}</div>
                  <div className="text-sm text-muted-foreground">Known Issues</div>
                </div>
              </div>

              {notificationStats.commonIssues.length > 0 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Common Issues:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {notificationStats.commonIssues.map((issue, index) => (
                        <li key={index} className="text-sm">{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationDiagnostics;