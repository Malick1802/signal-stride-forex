import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Bell, Settings, BookOpen, Wrench, Zap } from 'lucide-react';

// Import our new components
import EnhancedBatteryOptimizationGuide from './EnhancedBatteryOptimizationGuide';
import NotificationDiagnostics from './NotificationDiagnostics';
import MobilePlatformEducation from './MobilePlatformEducation';
import { PushNotificationSettings } from './PushNotificationSettings';

interface ComprehensiveNotificationCenterProps {
  defaultTab?: string;
}

export const ComprehensiveNotificationCenter: React.FC<ComprehensiveNotificationCenterProps> = ({ 
  defaultTab = 'settings' 
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notification Control Center
          </CardTitle>
          <CardDescription>
            Complete notification management, diagnostics, and mobile platform guidance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="setup" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Setup</span>
              </TabsTrigger>
              <TabsTrigger value="diagnostics" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Diagnostics</span>
              </TabsTrigger>
              <TabsTrigger value="education" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Learn</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Notification Preferences</h3>
                  <Badge variant="outline">Core Settings</Badge>
                </div>
                <PushNotificationSettings />
              </div>
            </TabsContent>

            <TabsContent value="setup" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Device Setup Guide</h3>
                  <Badge variant="outline">Device Specific</Badge>
                </div>
                <EnhancedBatteryOptimizationGuide />
              </div>
            </TabsContent>

            <TabsContent value="diagnostics" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">System Diagnostics</h3>
                  <Badge variant="outline">Health Check</Badge>
                </div>
                <NotificationDiagnostics />
              </div>
            </TabsContent>

            <TabsContent value="education" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="text-lg font-semibled">Platform Education</h3>
                  <Badge variant="outline">Understanding Limits</Badge>
                </div>
                <MobilePlatformEducation />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensiveNotificationCenter;