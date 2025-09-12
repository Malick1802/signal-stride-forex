import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Smartphone, 
  Battery, 
  Bell, 
  Wifi, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock,
  Settings
} from 'lucide-react';
import { getPlatformInfo } from '@/utils/platformDetection';

interface PlatformLimitation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  solution: string;
  technical: string;
}

const ANDROID_LIMITATIONS: PlatformLimitation[] = [
  {
    title: 'Battery Optimization',
    description: 'Android aggressively manages background apps to preserve battery life',
    impact: 'high',
    solution: 'Disable battery optimization for ForexAlert Pro in device settings',
    technical: 'Android\'s Doze Mode and App Standby can prevent background processing and FCM delivery'
  },
  {
    title: 'Background App Restrictions',
    description: 'Apps are limited in what they can do when not in the foreground',
    impact: 'high',
    solution: 'Enable background activity and auto-start permissions',
    technical: 'Android 6.0+ introduced background execution limits that can block notifications'
  },
  {
    title: 'Manufacturer Customizations',
    description: 'Samsung, Huawei, Xiaomi add extra power management layers',
    impact: 'high',
    solution: 'Follow manufacturer-specific setup instructions',
    technical: 'OEMs like MIUI, EMUI, One UI have additional app killing mechanisms'
  },
  {
    title: 'Network-Dependent Delivery',
    description: 'Push notifications require active internet connection',
    impact: 'medium',
    solution: 'Ensure stable internet connection and check data settings',
    technical: 'FCM requires Google Play Services and internet connectivity for delivery'
  }
];

const IOS_LIMITATIONS: PlatformLimitation[] = [
  {
    title: 'Background App Refresh',
    description: 'iOS strictly controls background processing to preserve battery',
    impact: 'high',
    solution: 'Enable Background App Refresh for ForexAlert Pro',
    technical: 'iOS suspends apps after a few minutes in background, limiting processing'
  },
  {
    title: 'Silent Push Limitations',
    description: 'Silent pushes are throttled and not guaranteed to wake the app',
    impact: 'medium',
    solution: 'Use visible notifications with sound/vibration',
    technical: 'Apple limits silent push frequency and may delay or drop them'
  },
  {
    title: 'Low Power Mode',
    description: 'Notifications may be delayed when battery saving is active',
    impact: 'medium',
    solution: 'Disable Low Power Mode or ensure critical notifications use high priority',
    technical: 'Low Power Mode reduces background activity and push notification frequency'
  },
  {
    title: 'Focus/Do Not Disturb',
    description: 'System-wide notification blocking affects all apps',
    impact: 'low',
    solution: 'Configure Focus settings to allow trading notifications',
    technical: 'Focus modes can override app-level notification settings'
  }
];

const WEB_LIMITATIONS: PlatformLimitation[] = [
  {
    title: 'Tab/Browser Must Stay Open',
    description: 'Web apps have limited background capabilities',
    impact: 'high',
    solution: 'Keep the browser tab open and use browser notifications',
    technical: 'Web Push requires active service worker and browser tab management'
  },
  {
    title: 'Browser-Specific Support',
    description: 'Not all browsers support push notifications equally',
    impact: 'medium',
    solution: 'Use Chrome, Firefox, or Safari for best notification support',
    technical: 'Safari has limited Web Push support, some mobile browsers don\'t support it'
  },
  {
    title: 'User Gesture Required',
    description: 'Notification permissions must be granted by user interaction',
    impact: 'low',
    solution: 'Click "Allow" when prompted for notification permissions',
    technical: 'Browsers require user gesture to prevent notification spam'
  }
];

export const MobilePlatformEducation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const platformInfo = getPlatformInfo();
  
  const getCurrentPlatformLimitations = (): PlatformLimitation[] => {
    if (platformInfo.isIOS) return IOS_LIMITATIONS;
    if (platformInfo.isAndroid) return ANDROID_LIMITATIONS;
    return WEB_LIMITATIONS;
  };

  const getPlatformIcon = () => {
    if (platformInfo.isNative) {
      return <Smartphone className="w-5 h-5" />;
    }
    return <Wifi className="w-5 h-5" />;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactBadge = (impact: string) => {
    const variant = impact === 'high' ? 'destructive' : impact === 'medium' ? 'secondary' : 'default';
    return <Badge variant={variant} className="capitalize">{impact} Impact</Badge>;
  };

  const currentLimitations = getCurrentPlatformLimitations();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPlatformIcon()}
            Mobile Platform Limitations
          </CardTitle>
          <CardDescription>
            Understanding why you might miss notifications and how to fix it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Current Platform:</strong> {platformInfo.isNative ? 
                (platformInfo.isAndroid ? 'Android Native App' : 'iOS Native App') : 
                'Web Browser'
              }. Each platform has different notification capabilities and limitations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="limitations">Limitations</TabsTrigger>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Why Do I Miss Notifications?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Battery className="w-4 h-4 text-red-500" />
                    <h4 className="font-medium">Power Management</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mobile operating systems prioritize battery life over app functionality. 
                    They automatically limit background activity and may kill apps to save power.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium">Security & Privacy</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Platforms restrict what apps can do in the background to protect user privacy 
                    and prevent malicious behavior.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <h4 className="font-medium">Performance</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Background restrictions help keep your device responsive by limiting 
                    resource-intensive operations when apps aren't actively being used.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="w-4 h-4 text-green-500" />
                    <h4 className="font-medium">Network Dependency</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Push notifications rely on internet connectivity and cloud services. 
                    Poor network conditions can delay or prevent notification delivery.
                  </p>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Good News:</strong> These limitations exist for good reasons, and there are 
                  specific steps you can take to ensure reliable notifications for trading apps.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limitations" className="space-y-4">
          {currentLimitations.map((limitation, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{limitation.title}</span>
                  {getImpactBadge(limitation.impact)}
                </CardTitle>
                <CardDescription>{limitation.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`p-3 rounded-lg border ${getImpactColor(limitation.impact)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-sm">Impact on Notifications</span>
                  </div>
                  <p className="text-sm">{limitation.technical}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="solutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform-Specific Solutions</CardTitle>
              <CardDescription>
                Step-by-step fixes for {platformInfo.isAndroid ? 'Android' : platformInfo.isIOS ? 'iOS' : 'Web Browser'} notification issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentLimitations.map((limitation, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">{limitation.title}</h4>
                        <div className="text-sm text-muted-foreground mb-2">
                          <strong>Problem:</strong> {limitation.description}
                        </div>
                        <div className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">
                          <strong>Solution:</strong> {limitation.solution}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Alert className="mt-6">
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Need Help?</strong> Use the Enhanced Battery Setup guide and Notification Diagnostics 
                  tools to get step-by-step instructions specific to your device.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Deep Dive</CardTitle>
              <CardDescription>
                Understanding the technical aspects of mobile notification delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Push Notification Flow
                </h4>
                <div className="text-sm space-y-2 pl-6 border-l-2 border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Trading signal generated on server</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Server sends to Firebase Cloud Messaging (FCM)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>FCM delivers to device (can be delayed/blocked)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Device OS decides whether to wake app (main bottleneck)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>App processes notification and shows alert</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Battery className="w-4 h-4" />
                  Power Management Systems
                </h4>
                <div className="text-sm space-y-2">
                  <div className="p-3 bg-gray-50 rounded border">
                    <strong>Android Doze Mode:</strong> Reduces CPU and network activity when device is stationary
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <strong>App Standby:</strong> Restricts network access for infrequently used apps
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <strong>OEM Power Management:</strong> Additional restrictions from Samsung, Huawei, etc.
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <strong>iOS Background App Refresh:</strong> Controls which apps can update in background
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timing Considerations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 border rounded">
                    <strong>Immediate Delivery:</strong> ~1-5 seconds for high-priority notifications
                  </div>
                  <div className="p-3 border rounded">
                    <strong>Normal Delivery:</strong> ~10-30 seconds under normal conditions
                  </div>
                  <div className="p-3 border rounded">
                    <strong>Delayed Delivery:</strong> Minutes to hours if device is in deep sleep
                  </div>
                  <div className="p-3 border rounded">
                    <strong>Failed Delivery:</strong> 24-hour retry window before expiration
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobilePlatformEducation;