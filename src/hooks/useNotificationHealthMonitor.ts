import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { getPlatformInfo } from '@/utils/platformDetection';

export interface NotificationHealthStatus {
  overallHealth: number; // 0-100
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  lastChecked: Date;
}

export interface HealthCheckResult {
  category: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  weight: number; // How much this affects overall health (1-10)
}

export const useNotificationHealthMonitor = () => {
  const [healthStatus, setHealthStatus] = useState<NotificationHealthStatus>({
    overallHealth: 0,
    criticalIssues: [],
    warnings: [],
    recommendations: [],
    lastChecked: new Date()
  });

  const [isChecking, setIsChecking] = useState(false);

  const runHealthCheck = useCallback(async (): Promise<NotificationHealthStatus> => {
    setIsChecking(true);
    const results: HealthCheckResult[] = [];
    const platformInfo = getPlatformInfo();

    try {
      // Platform capability check
      if (platformInfo.isNative) {
        results.push({
          category: 'Platform',
          status: 'healthy',
          message: 'Native platform with full notification capabilities',
          weight: 8
        });
      } else {
        results.push({
          category: 'Platform',
          status: 'warning',
          message: 'Web platform with limited notification capabilities',
          weight: 6
        });
      }

      // Network connectivity check
      const isOnline = navigator.onLine;
      results.push({
        category: 'Network',
        status: isOnline ? 'healthy' : 'critical',
        message: isOnline ? 'Network connectivity available' : 'No network connection',
        weight: 10
      });

      // Notification API availability
      if (platformInfo.isNative) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const permissions = await LocalNotifications.checkPermissions();
          
          results.push({
            category: 'Permissions',
            status: permissions.display === 'granted' ? 'healthy' : 'critical',
            message: `Local notification permissions: ${permissions.display}`,
            weight: 10
          });
        } catch (error) {
          results.push({
            category: 'Permissions',
            status: 'critical',
            message: 'Cannot access local notification API',
            weight: 10
          });
        }
      } else {
        const browserPermission = Notification.permission;
        results.push({
          category: 'Permissions',
          status: browserPermission === 'granted' ? 'healthy' : 'warning',
          message: `Browser notification permissions: ${browserPermission}`,
          weight: 8
        });
      }

      // Battery optimization check (Android specific)
      if (platformInfo.isAndroid && platformInfo.isNative) {
        results.push({
          category: 'Battery Optimization',
          status: 'warning',
          message: 'Battery optimization status requires manual verification',
          weight: 9
        });

        results.push({
          category: 'Background Activity',
          status: 'warning', 
          message: 'Background activity permissions need verification',
          weight: 8
        });
      }

      // Service worker check (Web)
      if (!platformInfo.isNative) {
        try {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            results.push({
              category: 'Service Worker',
              status: registration ? 'healthy' : 'warning',
              message: registration ? 'Service worker active' : 'No service worker registered',
              weight: 6
            });
          } else {
            results.push({
              category: 'Service Worker',
              status: 'critical',
              message: 'Service workers not supported',
              weight: 8
            });
          }
        } catch (error) {
          results.push({
            category: 'Service Worker',
            status: 'warning',
            message: 'Cannot check service worker status',
            weight: 4
          });
        }
      }

      // Calculate overall health score
      const totalWeight = results.reduce((sum, result) => sum + result.weight, 0);
      const weightedScore = results.reduce((sum, result) => {
        const score = result.status === 'healthy' ? 100 : 
                     result.status === 'warning' ? 60 : 20;
        return sum + (score * result.weight);
      }, 0);
      
      const overallHealth = Math.round(weightedScore / totalWeight);

      // Categorize issues
      const criticalIssues = results
        .filter(r => r.status === 'critical')
        .map(r => `${r.category}: ${r.message}`);

      const warnings = results
        .filter(r => r.status === 'warning')
        .map(r => `${r.category}: ${r.message}`);

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (platformInfo.isAndroid && platformInfo.isNative) {
        recommendations.push('Complete the Enhanced Battery Setup guide for your device manufacturer');
        recommendations.push('Disable battery optimization for ForexAlert Pro');
        recommendations.push('Enable background activity permissions');
      }
      
      if (criticalIssues.some(issue => issue.includes('permissions'))) {
        recommendations.push('Enable notification permissions in app settings');
      }
      
      if (!isOnline) {
        recommendations.push('Check your internet connection');
      }
      
      if (overallHealth < 70) {
        recommendations.push('Run the full diagnostic test for detailed troubleshooting');
      }

      const status: NotificationHealthStatus = {
        overallHealth,
        criticalIssues,
        warnings,
        recommendations,
        lastChecked: new Date()
      };

      setHealthStatus(status);
      return status;

    } catch (error) {
      console.error('Health check failed:', error);
      const errorStatus: NotificationHealthStatus = {
        overallHealth: 0,
        criticalIssues: [`Health check failed: ${error}`],
        warnings: [],
        recommendations: ['Try refreshing the page and running the check again'],
        lastChecked: new Date()
      };
      setHealthStatus(errorStatus);
      return errorStatus;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Run initial health check
  useEffect(() => {
    runHealthCheck();
    
    // Set up periodic health checks (every 5 minutes)
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  // Monitor network changes
  useEffect(() => {
    const handleOnline = () => runHealthCheck();
    const handleOffline = () => runHealthCheck();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runHealthCheck]);

  return {
    healthStatus,
    isChecking,
    runHealthCheck
  };
};