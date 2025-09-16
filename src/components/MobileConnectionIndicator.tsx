import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useConnectionManager } from '@/hooks/useConnectionManager';
import { Button } from '@/components/ui/button';
import { getPlatformInfo } from '@/utils/platformDetection';
import { Card } from '@/components/ui/card';

interface MobileConnectionIndicatorProps {
  showDetailedStatus?: boolean;
  onRetry?: () => void;
}

export const MobileConnectionIndicator: React.FC<MobileConnectionIndicatorProps> = ({ 
  showDetailedStatus = false,
  onRetry 
}) => {
  const { connectionState, retryConnection } = useConnectionManager();
  const { isOnline, isSupabaseConnected, connectionType, lastConnected, retryCount, isRetrying } = connectionState;
  const platformInfo = getPlatformInfo();

  // Don't show on desktop or when fully connected
  if (!platformInfo.isMobile || (isOnline && isSupabaseConnected)) {
    return null;
  }

  const handleRetryClick = () => {
    if (onRetry) {
      onRetry();
    } else {
      retryConnection();
    }
  };

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        title: 'No Internet Connection',
        message: 'Check your WiFi or mobile data connection'
      };
    } else if (!isSupabaseConnected) {
      return {
        icon: AlertTriangle,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
        title: 'Server Connection Issue',
        message: 'Unable to connect to ForexAlert Pro servers'
      };
    } else {
      return {
        icon: CheckCircle,
        color: 'text-emerald-400',  
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
        title: 'Connected',
        message: 'All systems operational'
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (!showDetailedStatus) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.title}
        </span>
        {!isSupabaseConnected && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRetryClick}
            disabled={isRetrying}
            className={`text-xs ${statusInfo.color} hover:bg-white/10`}
          >
            <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border p-4`}>
      <div className="flex items-start space-x-3">
        <StatusIcon className={`h-5 w-5 ${statusInfo.color} mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.title}
            </span>
            {platformInfo.isNative && connectionType !== 'unknown' && (
              <>
                <span className="text-gray-400 text-xs">•</span>
                <span className="text-gray-400 text-xs capitalize">{connectionType}</span>
              </>
            )}
          </div>
          
          <p className="text-gray-300 text-xs mb-3">
            {statusInfo.message}
            {!isOnline && platformInfo.isNative && 
              '. Push notifications may still work when connection is restored.'
            }
          </p>
          
          {lastConnected && !isSupabaseConnected && (
            <p className="text-gray-400 text-xs mb-3">
              Last connected: {new Date(lastConnected).toLocaleTimeString()}
            </p>
          )}
          
          {retryCount > 0 && !isSupabaseConnected && (
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
              <span className="text-yellow-400 text-xs">
                Retry attempts: {retryCount}
              </span>
            </div>
          )}
          
          {!isSupabaseConnected && (
            <Button
              onClick={handleRetryClick}
              size="sm"
              disabled={isRetrying}
              className={`${statusInfo.bgColor.replace('/20', '/30')} hover:${statusInfo.bgColor.replace('/20', '/40')} ${statusInfo.color} border-0`}
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Reconnecting...' : 'Retry Connection'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};