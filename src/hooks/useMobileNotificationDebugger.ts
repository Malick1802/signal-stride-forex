import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DebugTestResult {
  timestamp: string;
  test: string;
  result: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

export const useMobileNotificationDebugger = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<DebugTestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const addTestResult = (test: string, result: 'success' | 'error' | 'info', message: string, data?: any) => {
    const testResult: DebugTestResult = {
      timestamp: new Date().toISOString(),
      test,
      result,
      message,
      data
    };
    
    setTestResults(prev => [...prev.slice(-9), testResult]); // Keep last 10 results
    console.log(`🧪 ${test}: ${message}`, data);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const testPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      addTestResult('Permissions', 'error', 'Not on native platform');
      return false;
    }

    setIsRunningTest(true);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Check current permissions
      const currentPerms = await PushNotifications.checkPermissions();
      addTestResult('Permissions', 'info', 'Current permissions checked', currentPerms);
      
      if (currentPerms.receive !== 'granted') {
        addTestResult('Permissions', 'info', 'Requesting permissions...');
        const newPerms = await PushNotifications.requestPermissions();
        addTestResult('Permissions', newPerms.receive === 'granted' ? 'success' : 'error', 
          `Permission request result: ${newPerms.receive}`, newPerms);
        return newPerms.receive === 'granted';
      } else {
        addTestResult('Permissions', 'success', 'Permissions already granted');
        return true;
      }
    } catch (error) {
      addTestResult('Permissions', 'error', `Permission test failed: ${error}`);
      return false;
    } finally {
      setIsRunningTest(false);
    }
  };

  const testTokenGeneration = async () => {
    if (!Capacitor.isNativePlatform()) {
      addTestResult('Token Generation', 'error', 'Not on native platform');
      return null;
    }

    setIsRunningTest(true);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Clear existing listeners
      await PushNotifications.removeAllListeners();
      addTestResult('Token Generation', 'info', 'Cleared existing listeners');
      
      return new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => {
          addTestResult('Token Generation', 'error', 'Token generation timeout (10s)');
          resolve(null);
        }, 10000);

        PushNotifications.addListener('registration', (token) => {
          clearTimeout(timeout);
          addTestResult('Token Generation', 'success', 
            `Token received (${token.value.length} chars)`, 
            { prefix: token.value.substring(0, 30) });
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          clearTimeout(timeout);
          addTestResult('Token Generation', 'error', `Registration error: ${JSON.stringify(error)}`, error);
          resolve(null);
        });

        // Start registration
        PushNotifications.register().then(() => {
          addTestResult('Token Generation', 'info', 'Registration initiated');
        }).catch((error) => {
          clearTimeout(timeout);
          addTestResult('Token Generation', 'error', `Registration failed: ${error}`);
          resolve(null);
        });
      });
    } catch (error) {
      addTestResult('Token Generation', 'error', `Token generation failed: ${error}`);
      return null;
    } finally {
      setIsRunningTest(false);
    }
  };

  const testDatabaseSave = async (token?: string) => {
    if (!user) {
      addTestResult('Database Save', 'error', 'No authenticated user');
      return false;
    }

    if (!token) {
      addTestResult('Database Save', 'error', 'No token provided');
      return false;
    }

    setIsRunningTest(true);
    try {
      // Test session validity
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        addTestResult('Database Save', 'error', 'Invalid session', { sessionError });
        return false;
      }
      
      addTestResult('Database Save', 'success', 'Session validated');

      // Test profile upsert
      const deviceType = Capacitor.getPlatform();
      const upsertData = {
        id: user.id,
        email: user.email || '',
        push_token: token,
        device_type: deviceType,
        push_enabled: true,
        push_notifications_enabled: true,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(upsertData, { onConflict: 'id' });

      if (upsertError) {
        addTestResult('Database Save', 'error', `Upsert failed: ${upsertError.message}`, upsertError);
        return false;
      }

      addTestResult('Database Save', 'success', 'Profile upserted successfully');

      // Verify save
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('push_token, device_type, updated_at')
        .eq('id', user.id)
        .single();

      if (verifyError) {
        addTestResult('Database Save', 'error', `Verification failed: ${verifyError.message}`, verifyError);
        return false;
      }

      const tokenMatches = verifyData.push_token === token;
      addTestResult('Database Save', tokenMatches ? 'success' : 'error', 
        `Verification: ${tokenMatches ? 'Token matches' : 'Token mismatch'}`, verifyData);

      return tokenMatches;
    } catch (error) {
      addTestResult('Database Save', 'error', `Database test failed: ${error}`);
      return false;
    } finally {
      setIsRunningTest(false);
    }
  };

  const testFcmDirect = async (token: string) => {
    setIsRunningTest(true);
    try {
      addTestResult('FCM Direct', 'info', 'Sending direct FCM test...');
      
      const { data, error } = await supabase.functions.invoke('send-fcm-direct', {
        body: {
          token,
          title: 'FCM Direct Test',
          body: 'Testing direct FCM delivery to your device.',
          data: { source: 'MobileNotificationDebugger', timestamp: Date.now() }
        }
      });
      
      if (error) {
        addTestResult('FCM Direct', 'error', `FCM error: ${error.message}`, error);
        return false;
      } else {
        addTestResult('FCM Direct', 'success', 'FCM direct test sent', data);
        return true;
      }
    } catch (error) {
      addTestResult('FCM Direct', 'error', `FCM direct test failed: ${error}`);
      return false;
    } finally {
      setIsRunningTest(false);
    }
  };

  const testLocalNotification = async () => {
    if (!Capacitor.isNativePlatform()) {
      addTestResult('Local Notification', 'error', 'Not on native platform');
      return false;
    }

    setIsRunningTest(true);
    try {
      const { MobileNotificationManager } = await import('@/utils/mobileNotifications');
      
      await MobileNotificationManager.testNotification();
      addTestResult('Local Notification', 'success', 'Local notification sent');
      return true;
    } catch (error) {
      addTestResult('Local Notification', 'error', `Local notification failed: ${error}`);
      return false;
    } finally {
      setIsRunningTest(false);
    }
  };

  const runFullDiagnostic = async () => {
    addTestResult('Full Diagnostic', 'info', 'Starting comprehensive diagnostic...');
    
    // Test 1: Permissions
    const hasPermissions = await testPermissions();
    if (!hasPermissions) {
      addTestResult('Full Diagnostic', 'error', 'Diagnostic stopped - no permissions');
      return;
    }

    // Test 2: Token Generation
    const token = await testTokenGeneration();
    if (!token) {
      addTestResult('Full Diagnostic', 'error', 'Diagnostic stopped - no token');
      return;
    }

    // Test 3: Database Save
    const dbSuccess = await testDatabaseSave(token);
    if (!dbSuccess) {
      addTestResult('Full Diagnostic', 'error', 'Diagnostic stopped - database save failed');
      return;
    }

    // Test 4: Local Notification
    await testLocalNotification();

    // Test 5: FCM Direct (if token available)
    if (token) {
      await testFcmDirect(token);
    }

    addTestResult('Full Diagnostic', 'success', 'Full diagnostic completed');
  };

  return {
    testResults,
    isRunningTest,
    clearTestResults,
    testPermissions,
    testTokenGeneration,
    testDatabaseSave,
    testFcmDirect,
    testLocalNotification,
    runFullDiagnostic
  };
};