import React from 'react';
import { useRealTimeManager } from '@/hooks/useRealTimeManager';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock, Activity } from 'lucide-react';

interface RealTimeStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const { state, isConnected, lastHeartbeat, activeChannels } = useRealTimeManager();

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (state.connectionAttempts > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (state.connectionAttempts > 0) return `Reconnecting... (${state.connectionAttempts})`;
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isConnected) return <Wifi className="h-3 w-3" />;
    if (state.connectionAttempts > 0) return <Activity className="h-3 w-3 animate-pulse" />;
    return <WifiOff className="h-3 w-3" />;
  };

  const formatLastHeartbeat = () => {
    if (!lastHeartbeat) return 'Never';
    const diff = Date.now() - lastHeartbeat;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    return `${Math.floor(diff / 60000)}m ago`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={isConnected ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {showDetails && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatLastHeartbeat()}
          </div>
          <div>
            Channels: {activeChannels.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeStatus;