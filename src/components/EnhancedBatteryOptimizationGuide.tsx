import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Battery, Shield, Bell, Smartphone, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { getPlatformInfo } from '@/utils/platformDetection';

interface DeviceInstructions {
  manufacturer: string;
  steps: {
    title: string;
    description: string;
    path?: string;
    warning?: string;
  }[];
}

const DEVICE_INSTRUCTIONS: DeviceInstructions[] = [
  {
    manufacturer: 'Samsung',
    steps: [
      {
        title: 'Disable Battery Optimization',
        description: 'Settings → Apps → ForexAlert Pro → Battery → Optimize battery usage → Turn OFF',
        path: 'Settings > Apps > Special access > Optimize battery usage'
      },
      {
        title: 'Allow Background Activity',
        description: 'Settings → Apps → ForexAlert Pro → Battery → Allow background activity',
        warning: 'Essential for receiving notifications when app is closed'
      },
      {
        title: 'Disable Adaptive Battery',
        description: 'Settings → Device care → Battery → More battery settings → Adaptive battery → OFF',
        path: 'Settings > Device care > Battery > More battery settings'
      },
      {
        title: 'Add to Never Sleeping Apps',
        description: 'Settings → Apps → ForexAlert Pro → Battery → Put app to sleep → Never',
        warning: 'Prevents Samsung from automatically sleeping the app'
      }
    ]
  },
  {
    manufacturer: 'Huawei/Honor',
    steps: [
      {
        title: 'Disable Battery Optimization',
        description: 'Settings → Apps → ForexAlert Pro → Battery → Ignore optimizations',
        warning: 'Critical for Huawei devices due to aggressive power management'
      },
      {
        title: 'Enable Auto-Launch',
        description: 'Settings → Apps → ForexAlert Pro → Auto-launch → Enable',
        path: 'Phone Manager > App launch > ForexAlert Pro > Manage manually'
      },
      {
        title: 'Lock in Recent Apps',
        description: 'Recent apps → Find ForexAlert Pro → Pull down → Lock',
        warning: 'Prevents EMUI from killing the app'
      },
      {
        title: 'Disable Power Genie',
        description: 'Phone Manager → Close apps after screen lock → Find ForexAlert Pro → Turn OFF'
      }
    ]
  },
  {
    manufacturer: 'Xiaomi/MIUI',
    steps: [
      {
        title: 'Disable Battery Optimization',
        description: 'Settings → Apps → Manage apps → ForexAlert Pro → Battery saver → No restrictions',
        path: 'Settings > Apps > Permissions > Other permissions'
      },
      {
        title: 'Enable Autostart',
        description: 'Security → Permissions → Autostart → ForexAlert Pro → Enable',
        warning: 'MIUI aggressively manages background apps'
      },
      {
        title: 'Background App Refresh',
        description: 'Settings → Apps → Manage apps → ForexAlert Pro → Battery saver → Background activity',
        path: 'Settings > Battery & performance > App battery saver'
      },
      {
        title: 'Lock in Recent Apps',
        description: 'Recent apps → ForexAlert Pro → Pull down to lock',
        warning: 'Essential for MIUI devices'
      }
    ]
  },
  {
    manufacturer: 'OnePlus',
    steps: [
      {
        title: 'Battery Optimization',
        description: 'Settings → Apps & notifications → ForexAlert Pro → Advanced → Battery → Don\'t optimize',
        path: 'Settings > Battery > Battery optimization'
      },
      {
        title: 'Background App Refresh',
        description: 'Settings → Apps & notifications → ForexAlert Pro → Advanced → Background activity',
        warning: 'OnePlus OxygenOS can be restrictive with background apps'
      },
      {
        title: 'Recent Apps Management',
        description: 'Recent apps → ForexAlert Pro → Lock app (pull down or tap lock icon)'
      }
    ]
  },
  {
    manufacturer: 'Generic Android',
    steps: [
      {
        title: 'Battery Optimization',
        description: 'Settings → Apps → ForexAlert Pro → Battery → Battery optimization → Don\'t optimize',
        path: 'May vary by manufacturer and Android version'
      },
      {
        title: 'Background Restrictions',
        description: 'Settings → Apps → ForexAlert Pro → Battery → Background activity → Allow',
        warning: 'Location may vary depending on your device'
      },
      {
        title: 'Notification Settings',
        description: 'Settings → Apps → ForexAlert Pro → Notifications → Allow all notifications',
        warning: 'Ensure all notification categories are enabled'
      }
    ]
  }
];

export const EnhancedBatteryOptimizationGuide: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [detectedManufacturer, setDetectedManufacturer] = useState<string>('Generic Android');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Detect device manufacturer from user agent
    const platform = getPlatformInfo();
    if (platform.isAndroid) {
      const ua = platform.userAgent.toLowerCase();
      
      if (ua.includes('samsung')) setDetectedManufacturer('Samsung');
      else if (ua.includes('huawei') || ua.includes('honor')) setDetectedManufacturer('Huawei/Honor');
      else if (ua.includes('xiaomi') || ua.includes('miui')) setDetectedManufacturer('Xiaomi/MIUI');
      else if (ua.includes('oneplus')) setDetectedManufacturer('OnePlus');
      else setDetectedManufacturer('Generic Android');
    }
  }, []);

  // Only show on Android native platform
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return null;
  }

  const toggleStepCompletion = (stepKey: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepKey)) {
      newCompleted.delete(stepKey);
    } else {
      newCompleted.add(stepKey);
    }
    setCompletedSteps(newCompleted);
  };

  const getCompletionRate = (manufacturer: string) => {
    const instructions = DEVICE_INSTRUCTIONS.find(d => d.manufacturer === manufacturer);
    if (!instructions) return 0;
    
    const total = instructions.steps.length;
    const completed = instructions.steps.filter((_, index) => 
      completedSteps.has(`${manufacturer}-${index}`)
    ).length;
    
    return Math.round((completed / total) * 100);
  };

  if (!isVisible) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <Bell className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="text-orange-800 font-medium">Notification Setup Required</span>
            <p className="text-orange-700 text-sm mt-1">
              Configure your {detectedManufacturer} device for reliable notifications
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsVisible(true)} className="border-orange-300 text-orange-700 hover:bg-orange-100">
            Setup Guide
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Enhanced Battery Setup
          </div>
          <Badge variant={getCompletionRate(detectedManufacturer) === 100 ? "default" : "secondary"}>
            {getCompletionRate(detectedManufacturer)}% Complete
          </Badge>
        </CardTitle>
        <CardDescription>
          Device-specific instructions for {detectedManufacturer} to ensure reliable push notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={detectedManufacturer} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 mb-4">
            {DEVICE_INSTRUCTIONS.map((device) => (
              <TabsTrigger 
                key={device.manufacturer} 
                value={device.manufacturer}
                className="text-xs"
              >
                {device.manufacturer.split('/')[0]}
                {getCompletionRate(device.manufacturer) === 100 && (
                  <CheckCircle className="w-3 h-3 ml-1 text-green-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {DEVICE_INSTRUCTIONS.map((device) => (
            <TabsContent key={device.manufacturer} value={device.manufacturer}>
              <div className="space-y-4">
                {device.steps.map((step, index) => {
                  const stepKey = `${device.manufacturer}-${index}`;
                  const isCompleted = completedSteps.has(stepKey);
                  
                  return (
                    <div 
                      key={index}
                      className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-sm ${
                        isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                      onClick={() => toggleStepCompletion(stepKey)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'bg-primary text-primary-foreground'
                        }`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {step.description}
                          </p>
                          
                          {step.path && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
                              <Info className="w-3 h-3" />
                              <span>Path: {step.path}</span>
                            </div>
                          )}
                          
                          {step.warning && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <AlertCircle className="w-3 h-3" />
                              <span>{step.warning}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <Alert className="mt-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important for {device.manufacturer}:</strong> These settings are crucial for receiving notifications when the app is closed. Each manufacturer has different power management policies.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => setIsVisible(false)}>
            Done
          </Button>
          <Button 
            variant="default" 
            onClick={() => {
              // This would open device settings with a custom plugin
              console.log('📱 Opening device app settings');
            }}
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Open App Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedBatteryOptimizationGuide;