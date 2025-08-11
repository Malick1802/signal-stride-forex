import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  error?: string;
}

export const PushNotificationSetup = () => {
  const { isRegistered, pushToken, permissionError, initializePushNotifications } = usePushNotifications();
  const { user } = useAuth();
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  const runSetupWizard = async () => {
    setIsSetupInProgress(true);
    const steps: SetupStep[] = [
      { id: 'auth', title: 'User Authentication', description: 'Verify user is logged in', completed: false },
      { id: 'platform', title: 'Platform Check', description: 'Verify native platform', completed: false },
      { id: 'permissions', title: 'Request Permissions', description: 'Ask for notification permissions', completed: false },
      { id: 'registration', title: 'Token Registration', description: 'Register for push tokens', completed: false },
      { id: 'database', title: 'Database Save', description: 'Save token to database', completed: false },
    ];

    setSetupSteps([...steps]);

    try {
      // Step 1: Authentication
      if (!user) {
        steps[0].error = 'User not authenticated';
        setSetupSteps([...steps]);
        return;
      }
      steps[0].completed = true;
      setSetupSteps([...steps]);

      // Step 2: Platform Check
      if (!isNative) {
        steps[1].error = 'Not on native platform';
        setSetupSteps([...steps]);
        return;
      }
      steps[1].completed = true;
      setSetupSteps([...steps]);

      // Step 3: Permissions
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive !== 'granted') {
          steps[2].error = `Permission denied: ${permission.receive}`;
          setSetupSteps([...steps]);
          return;
        }
        steps[2].completed = true;
        setSetupSteps([...steps]);
      } catch (error) {
        steps[2].error = `Permission error: ${error}`;
        setSetupSteps([...steps]);
        return;
      }

      // Step 4 & 5: Registration and Database Save
      const success = await initializePushNotifications();
      
      if (success) {
        steps[3].completed = true;
        steps[4].completed = true;
      } else {
        steps[3].error = permissionError || 'Registration failed';
      }
      
      setSetupSteps([...steps]);

    } finally {
      setIsSetupInProgress(false);
    }
  };

  const completedSteps = setupSteps.filter(step => step.completed).length;
  const progress = setupSteps.length > 0 ? (completedSteps / setupSteps.length) * 100 : 0;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔔 Push Notifications Setup
          <Badge variant={isRegistered ? "default" : "secondary"}>
            {isRegistered ? "Enabled" : "Not Enabled"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Set up push notifications for trading signals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        {isRegistered ? (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ Push notifications are enabled and working!
            </AlertDescription>
          </Alert>
        ) : !isNative ? (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              📱 Push notifications require the mobile app
            </AlertDescription>
          </Alert>
        ) : !user ? (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              👤 Please log in to enable push notifications
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertDescription className="text-orange-800">
              ⚙️ Push notifications need to be set up
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Progress */}
        {setupSteps.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{completedSteps}/{setupSteps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Setup Steps */}
            <div className="space-y-2">
              {setupSteps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-3 p-2 rounded-md ${
                    step.completed ? 'bg-green-50' : step.error ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.completed ? 'bg-green-500 text-white' : 
                    step.error ? 'bg-red-500 text-white' : 
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {step.completed ? '✓' : step.error ? '✗' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      step.completed ? 'text-green-800' : step.error ? 'text-red-800' : 'text-gray-700'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs ${
                      step.error ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {step.error || step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {permissionError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {permissionError}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        {!isRegistered && (
          <Button 
            onClick={runSetupWizard} 
            disabled={isSetupInProgress || !user || !isNative}
            className="w-full"
          >
            {isSetupInProgress ? 'Setting up...' : '🚀 Set Up Push Notifications'}
          </Button>
        )}

        {/* Token Display (for debugging) */}
        {pushToken && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800 mb-1">Token Registered</p>
            <p className="text-xs font-mono text-blue-600 break-all">
              {pushToken.substring(0, 40)}...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};