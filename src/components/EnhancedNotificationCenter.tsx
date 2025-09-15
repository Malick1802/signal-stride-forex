import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { NotificationReliabilityMonitor } from './NotificationReliabilityMonitor';
import { PushNotificationSettings } from './PushNotificationSettings';
import { PushNotificationTester } from './PushNotificationTester';
import { MobileInitializer } from './MobileInitializer';
import { EnhancedBatteryOptimizationGuide } from './EnhancedBatteryOptimizationGuide';
import { Capacitor } from '@capacitor/core';

interface EnhancedNotificationCenterProps {
  defaultTab?: string;
}

export const EnhancedNotificationCenter: React.FC<EnhancedNotificationCenterProps> = ({ 
  defaultTab = 'monitor' 
}) => {
  const [statusLogs, setStatusLogs] = useState<string[]>([]);

  const handleStatusUpdate = (status: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setStatusLogs(prev => [`${timestamp}: ${status}`, ...prev.slice(0, 9)]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Enhanced Notification Center</CardTitle>
        <CardDescription>
          Comprehensive notification management with reliability monitoring and diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="monitor">Monitor</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Live monitoring of notification delivery systems and connection health
              </p>
              <NotificationReliabilityMonitor />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your notification settings and delivery preferences
              </p>
              <PushNotificationSettings />
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Testing & Verification</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Test notification delivery across different scenarios
              </p>
              <PushNotificationTester />
              
              {statusLogs.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Status Updates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs font-mono">
                      {statusLogs.map((log, index) => (
                        <div key={index} className="text-muted-foreground">
                          {log}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Device Setup & Optimization</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your device for optimal notification delivery
              </p>
              
              {Capacitor.isNativePlatform() && (
                <>
                  <MobileInitializer 
                    onStatusUpdate={handleStatusUpdate} 
                    showTester={false} 
                  />
                  <EnhancedBatteryOptimizationGuide />
                </>
              )}
              
              {!Capacitor.isNativePlatform() && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Device setup is only available on mobile devices. 
                      Open this app on your phone to access mobile-specific features.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Advanced Diagnostics</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Detailed diagnostic information and troubleshooting tools
              </p>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Platform Information</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div>Platform: {Capacitor.getPlatform()}</div>
                  <div>Native: {Capacitor.isNativePlatform() ? 'Yes' : 'No'}</div>
                  <div>User Agent: {navigator.userAgent}</div>
                  <div>Timestamp: {new Date().toISOString()}</div>
                </CardContent>
              </Card>

              {statusLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Diagnostic Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs font-mono max-h-64 overflow-y-auto">
                      {statusLogs.map((log, index) => (
                        <div key={index} className="text-muted-foreground">
                          {log}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};