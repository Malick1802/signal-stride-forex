
import React from 'react';
import { useSystemHealthMonitor } from '@/hooks/useSystemHealthMonitor';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export const SystemHealthIndicator = () => {
  const { systemHealth } = useSystemHealthMonitor();

  // Hide health indicator on mobile APK to avoid "App Health Issues" warnings
  if (window.location.href.includes('capacitor://') || window.navigator.userAgent.includes('Mobile')) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        {systemHealth.pureOutcomeActive ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        )}
        <Badge variant={systemHealth.pureOutcomeActive ? "default" : "secondary"}>
          Pure Outcome Active
        </Badge>
      </div>
      
      {systemHealth.timeBasedEliminanted && (
        <Badge variant="outline" className="text-green-600 border-green-600">
          Time-Based Expiration Eliminated
        </Badge>
      )}
    </div>
  );
};
