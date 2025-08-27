import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Capacitor } from '@capacitor/core';
import { useMobileNotificationDebugger } from '@/hooks/useMobileNotificationDebugger';
import { MobileNotificationManager } from '@/utils/mobileNotifications';

export const MobileNotificationDebugger: React.FC = () => {
  const {
    testResults,
    isRunningTest,
    clearTestResults,
    testPermissions,
    testTokenGeneration,
    testLocalNotification,
    runFullDiagnostic
  } = useMobileNotificationDebugger();

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const userAgent = navigator.userAgent;

  // Detect if we're actually in Android WebView
  const isAndroidWebView = userAgent.includes('wv') || userAgent.includes('ForexAlertPro');
  const supportsLocalNotifications = isNative || isAndroidWebView;
  const supportsPushNotifications = isNative || isAndroidWebView;
  const supportsWebNotifications = !isNative && 'Notification' in window;

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-400">Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-blue-400">Loading:</span>
            <Badge variant={isRunningTest ? "destructive" : "secondary"}>
              {isRunningTest ? "Yes" : "No"}
            </Badge>
            
            <span className="text-blue-400">Supported:</span>
            <Badge variant={supportsLocalNotifications ? "default" : "destructive"}>
              {supportsLocalNotifications ? "✅ Yes" : "❌ No"}
            </Badge>
            
            <span className="text-blue-400">Platform:</span>
            <span className="text-gray-300">{platform}</span>
            
            <span className="text-blue-400">Native:</span>
            <Badge variant={isNative ? "default" : "destructive"}>
              {isNative ? "✅ Yes" : "❌ No"}
            </Badge>
            
            <span className="text-blue-400">Permission:</span>
            <span className="text-gray-300">
              {supportsLocalNotifications ? "supported" : "unsupported"}
            </span>
            
            <span className="text-blue-400">Local Notifications:</span>
            <Badge variant={supportsLocalNotifications ? "default" : "destructive"}>
              {supportsLocalNotifications ? "✅" : "❌"}
            </Badge>
            
            <span className="text-blue-400">Web Notifications:</span>
            <Badge variant={supportsWebNotifications ? "default" : "destructive"}>
              {supportsWebNotifications ? "✅" : "❌"}
            </Badge>
            
            <span className="text-blue-400">Push Notifications:</span>
            <Badge variant={supportsPushNotifications ? "default" : "destructive"}>
              {supportsPushNotifications ? "✅" : "❌"}
            </Badge>
          </div>
          
          {isAndroidWebView && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">
                ✅ Android WebView detected - notifications should work!
              </p>
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500">
            <strong>User Agent:</strong> {userAgent}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-orange-400">Notification Status</CardTitle>
          <Badge variant={supportsLocalNotifications ? "default" : "secondary"}>
            {supportsLocalNotifications ? "Supported" : "Not Supported"}
          </Badge>
        </CardHeader>
        <CardContent>
          {supportsLocalNotifications ? (
            <div className="space-y-3">
              <p className="text-gray-300">
                {isAndroidWebView 
                  ? "Android WebView - notifications are available" 
                  : isNative 
                  ? "Native platform - notifications are available"
                  : "Notifications are supported"}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={testPermissions} 
                  disabled={isRunningTest}
                  size="sm"
                  variant="outline"
                >
                  Test Permissions
                </Button>
                
                <Button 
                  onClick={testLocalNotification} 
                  disabled={isRunningTest}
                  size="sm"
                  variant="outline"
                >
                  Test Local
                </Button>
                
                <Button 
                  onClick={runFullDiagnostic} 
                  disabled={isRunningTest}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Full Diagnostic
                </Button>
                
                <Button 
                  onClick={clearTestResults} 
                  disabled={isRunningTest}
                  size="sm"
                  variant="secondary"
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <h4 className="text-orange-400 font-medium mb-2">Notifications Not Available</h4>
              <p className="text-gray-300 text-sm">
                No notification APIs are available. Please use a modern browser or install the mobile app.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-400">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs p-2 bg-gray-800/50 rounded border-l-2 border-l-gray-600">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        result.result === 'success' ? 'default' :
                        result.result === 'error' ? 'destructive' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {result.test}
                    </Badge>
                    <span className="text-gray-400">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-300 mt-1">{result.message}</p>
                  {result.data && (
                    <pre className="text-gray-500 text-xs mt-1 overflow-hidden">
                      {JSON.stringify(result.data, null, 2).slice(0, 200)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};