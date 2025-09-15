import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMobileNotificationManager } from '@/hooks/useMobileNotificationManager';
import { useMobileNotificationDebugger } from '@/hooks/useMobileNotificationDebugger';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { PushNotificationSetup } from './PushNotificationSetup';
import FCMSetupGuide from './FCMSetupGuide';
import SystemStatusMonitor from './SystemStatusMonitor';
import { 
  Smartphone, 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  RefreshCw,
  Loader2,
  Database,
  MessageSquare,
  Bell,
  Zap,
  Settings
} from 'lucide-react';


export const PushNotificationDebugger = () => {
  const { isRegistered, pushToken, permissionError, initializePushNotifications, sendTestNotification } = usePushNotifications();
  const { sendTestNotification: sendMobileTest } = useMobileNotificationManager();
  const { 
    testResults: debugTestResults, 
    isRunningTest, 
    clearTestResults,
    testPermissions: debugTestPermissions,
    testTokenGeneration: debugTestTokenGeneration,
    testDatabaseSave: debugTestDatabaseSave,
    testFcmDirect: debugTestFcmDirect,
    testLocalNotification,
    runFullDiagnostic
  } = useMobileNotificationDebugger();
  const { profile } = useProfile();
  const { user, session } = useAuth();
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // Comprehensive debugging info collection
  useEffect(() => {
    const collectDebugInfo = async () => {
      const info: any = {
        platform,
        isNative,
        user: user ? { id: user.id, email: user.email } : null,
        session: session ? { access_token: !!session.access_token, expires_at: session.expires_at } : null,
        profile: profile ? { 
          push_enabled: profile.push_enabled,
          push_token: profile.push_token ? `${profile.push_token.substring(0, 20)}...` : null,
          device_type: profile.device_type 
        } : null,
        pushToken: pushToken ? `${pushToken.substring(0, 20)}...` : null,
        isRegistered,
        permissionError,
        timestamp: new Date().toISOString()
      };

      // Check Capacitor plugins availability
      if (isNative) {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          info.pushNotificationsPlugin = 'Available';
          
          // Check current permission status
          const permission = await PushNotifications.checkPermissions();
          info.currentPermissions = permission;
        } catch (e) {
          info.pushNotificationsPlugin = `Error: ${e}`;
        }

        try {
          const { Preferences } = await import('@capacitor/preferences');
          const { value } = await Preferences.get({ key: 'pushToken' });
          info.storedToken = value ? `${value.substring(0, 20)}...` : null;
        } catch (e) {
          info.preferencesError = `${e}`;
        }
      }

      setDebugInfo(info);
    };

    collectDebugInfo();
  }, [platform, isNative, user, session, profile, pushToken, isRegistered, permissionError]);

  const addTestResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev.slice(-4), `${timestamp}: ${message}`]);
  };

  const testFcmDirect = async () => {
    if (!pushToken) {
      addTestResult('❌ No push token available');
      return;
    }
    
    setIsLoading(true);
    addTestResult('🧪 Testing FCM direct delivery...');
    
    try {
      const { data, error } = await supabase.functions.invoke('send-fcm-direct', {
        body: {
          token: pushToken,
          title: 'FCM Direct Test',
          body: 'Testing direct FCM delivery to this device.',
          data: { source: 'PushNotificationDebugger' }
        }
      });
      
      if (error) {
        addTestResult(`❌ FCM Direct error: ${error.message}`);
      } else {
        addTestResult(`✅ FCM Direct success: ${JSON.stringify(data)}`);
      }
      
      console.log('send-fcm-direct result', { data, error });
    } catch (e) {
      const errorMsg = `${e}`;
      addTestResult(`❌ FCM Direct exception: ${errorMsg}`);
      console.error('send-fcm-direct error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const testPermissions = async () => {
    if (!isNative) {
      addTestResult('❌ Not on native platform');
      return;
    }

    setIsLoading(true);
    addTestResult('🔐 Testing permissions...');

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const permission = await PushNotifications.checkPermissions();
      addTestResult(`✅ Current permissions: ${JSON.stringify(permission)}`);
      
      if (permission.receive !== 'granted') {
        addTestResult('📱 Requesting permissions...');
        const newPermission = await PushNotifications.requestPermissions();
        addTestResult(`✅ New permissions: ${JSON.stringify(newPermission)}`);
      }
    } catch (e) {
      addTestResult(`❌ Permission test failed: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTokenGeneration = async () => {
    if (!isNative) {
      addTestResult('❌ Not on native platform');
      return;
    }

    setIsLoading(true);
    addTestResult('🎫 Testing token generation...');

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Clear existing listeners
      await PushNotifications.removeAllListeners();
      
      // Set up test listener
      PushNotifications.addListener('registration', (token) => {
        addTestResult(`✅ Token received: ${token.value.substring(0, 30)}...`);
      });

      PushNotifications.addListener('registrationError', (error) => {
        addTestResult(`❌ Token error: ${JSON.stringify(error)}`);
      });

      await PushNotifications.register();
      addTestResult('📱 Registration initiated...');
    } catch (e) {
      addTestResult(`❌ Token generation failed: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseSave = async () => {
    if (!user) {
      addTestResult('❌ No user authenticated');
      return;
    }
    
    if (!pushToken) {
      addTestResult('❌ No push token available');
      return;
    }

    setIsLoading(true);
    addTestResult('💾 Testing database save...');

    try {
      const testToken = `test_${Date.now()}_${pushToken.substring(0, 20)}`;
      
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            push_token: testToken,
            device_type: platform,
            push_enabled: true,
            push_notifications_enabled: true,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'id' }
        );

      if (error) {
        addTestResult(`❌ Database save failed: ${error.message}`);
      } else {
        addTestResult('✅ Database save successful');
        
        // Verify by reading back
        const { data, error: readError } = await supabase
          .from('profiles')
          .select('push_token, device_type, updated_at')
          .eq('id', user.id as any)
          .single();
          
        if (readError) {
          addTestResult(`❌ Database read failed: ${readError.message}`);
        } else {
          addTestResult(`✅ Verified: ${JSON.stringify(data)}`);
        }
      }
    } catch (e) {
      addTestResult(`❌ Database test failed: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthState = async () => {
    addTestResult('🔐 Checking auth state...');
    
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        addTestResult(`❌ Auth error: ${error.message}`);
        return;
      }
      
      if (!currentSession) {
        addTestResult('❌ No active session');
        return;
      }
      
      addTestResult(`✅ Session valid, expires: ${new Date(currentSession.expires_at! * 1000).toLocaleString()}`);
      
      // Check profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();
        
      if (profileError) {
        addTestResult(`❌ Profile error: ${profileError.message}`);
      } else {
        addTestResult(`✅ Profile found: ${profileData.email || 'No email'}`);
      }
    } catch (e) {
      addTestResult(`❌ Auth check failed: ${e}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <SystemStatusMonitor />
      
      <Separator className="my-6" />
      
      <PushNotificationSetup />
      
      <Separator className="my-6" />
      
      <FCMSetupGuide />
      
      <Separator className="my-6" />

    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📱 Push Notification Debugger
          <Badge variant={isRegistered ? "default" : "secondary"}>
            {isRegistered ? "Registered" : "Not Registered"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test and debug push notification functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Debug Information */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Debug Information</p>
          <div className="p-3 bg-muted rounded-lg text-xs font-mono">
            <pre className="whitespace-pre-wrap overflow-auto max-h-32">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>

        {/* Enhanced Test Results */}
        {(testResults.length > 0 || debugTestResults.length > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Test Results</p>
              <Button onClick={clearTestResults} variant="outline" size="sm">
                Clear
              </Button>
            </div>
            
            {/* Debug Test Results */}
            {debugTestResults.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono max-h-40 overflow-auto space-y-1">
                {debugTestResults.map((result, index) => (
                  <div key={index} className={`p-2 rounded ${
                    result.result === 'success' ? 'bg-green-100 text-green-800' :
                    result.result === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    <div className="font-medium">{result.test}</div>
                    <div>{result.message}</div>
                    <div className="text-xs opacity-75">{new Date(result.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Legacy Test Results */}
            {testResults.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono max-h-32 overflow-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="mb-1">{result}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Platform Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Platform</p>
            <p className="text-sm text-muted-foreground">{platform}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Native App</p>
            <p className="text-sm text-muted-foreground">{isNative ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* Push Token Status */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Push Token Status</p>
          {pushToken ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-mono break-all">
                {pushToken.substring(0, 50)}...
              </p>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">No push token available</p>
            </div>
          )}
        </div>

        {/* Profile Settings */}
        {profile && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Notification Preferences</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Push Enabled:</span>
                <Badge variant={profile.push_enabled ? "default" : "secondary"}>
                  {profile.push_enabled ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>New Signals:</span>
                <Badge variant={profile.push_new_signals ? "default" : "secondary"}>
                  {profile.push_new_signals ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Target Hits:</span>
                <Badge variant={profile.push_targets_hit ? "default" : "secondary"}>
                  {profile.push_targets_hit ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Stop Loss:</span>
                <Badge variant={profile.push_stop_loss ? "default" : "secondary"}>
                  {profile.push_stop_loss ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Display */}
        {permissionError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              <strong>Error:</strong> {permissionError}
            </AlertDescription>
          </Alert>
        )}

        {/* Auth Status Alert */}
        {!user && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              <strong>Warning:</strong> No user authenticated. Please log in to test push notifications.
            </AlertDescription>
          </Alert>
        )}

        {/* Native Platform Alert */}
        {!isNative && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>Info:</strong> Push notifications require a mobile app. Web testing is limited.
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Manual Testing Tools */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Manual Testing Tools</p>
          
          {/* Comprehensive Diagnostic */}
          <div className="mb-3">
            <Button 
              onClick={runFullDiagnostic} 
              variant="default" 
              disabled={isRunningTest || !isNative}
              className="w-full"
            >
              {isRunningTest ? 'Running Diagnostic...' : '🧪 Run Full Diagnostic'}
            </Button>
          </div>
          
          {/* Authentication & Database Tests */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={checkAuthState} variant="outline" size="sm" disabled={isLoading || isRunningTest}>
              Check Auth State
            </Button>
            <Button 
              onClick={() => debugTestDatabaseSave(pushToken || '')} 
              variant="outline" 
              size="sm" 
              disabled={isLoading || isRunningTest || !user || !pushToken}
            >
              Test DB Save
            </Button>
          </div>

          {/* Permission & Token Tests */}
          {isNative && (
            <div className="grid grid-cols-2 gap-2">
            <Button onClick={debugTestPermissions} variant="outline" size="sm" disabled={isLoading || isRunningTest}>
              Test Permissions
            </Button>
            <Button onClick={debugTestTokenGeneration} variant="outline" size="sm" disabled={isLoading || isRunningTest}>
              Test Token Generation
            </Button>
            </div>
          )}

          {/* Notification Tests */}
          <div className="grid grid-cols-3 gap-2">
            {!isRegistered ? (
              <Button onClick={initializePushNotifications} variant="default" disabled={isLoading || isRunningTest}>
                {isLoading ? 'Loading...' : 'Initialize Push'}
              </Button>
            ) : (
              <>
                <Button onClick={sendTestNotification} variant="outline" size="sm" disabled={isLoading || isRunningTest}>
                  Backend Push
                </Button>
                <Button onClick={testLocalNotification} variant="outline" size="sm" disabled={isLoading || isRunningTest}>
                  Local Test
                </Button>
                <Button 
                  onClick={() => pushToken && debugTestFcmDirect(pushToken)} 
                  variant="outline" 
                  size="sm" 
                  disabled={!pushToken || isLoading || isRunningTest}
                >
                  FCM Direct
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong>
            {!isNative ? (
              " Push notifications require a native mobile app. This web version only shows debugging info."
            ) : !isRegistered ? (
              " Click 'Initialize Push Notifications' to register for push notifications."
            ) : (
              " Your device is registered! Use the test buttons to verify functionality."
            )}
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};