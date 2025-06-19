
import React from 'react';
import { Clock, Crown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getTimeRemaining } from '../utils/subscriptionUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SubscriptionStatusWidgetProps {
  subscription: any;
  onUpgrade: () => void;
  onManageSubscription: () => void;
}

const SubscriptionStatusWidget: React.FC<SubscriptionStatusWidgetProps> = ({
  subscription,
  onUpgrade,
  onManageSubscription
}) => {
  const isMobile = useIsMobile();

  if (!subscription) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-white/20 rounded px-2 sm:px-3 py-1">
          <span className="text-gray-300 text-xs sm:text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (subscription.subscribed) {
    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
        <Badge variant="success" className="flex items-center space-x-1 text-xs">
          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          <span className={isMobile ? 'hidden sm:inline' : ''}>
            {subscription.subscription_tier}
          </span>
          {isMobile && <span className="sm:hidden">Pro</span>}
        </Badge>
        <Button 
          size={isMobile ? "sm" : "sm"} 
          variant="outline" 
          onClick={onManageSubscription}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs px-2 sm:px-3"
        >
          {isMobile ? 'Manage' : 'Manage'}
        </Button>
      </div>
    );
  }

  if (subscription.is_trial_active) {
    const timeRemaining = getTimeRemaining(subscription.trial_end);
    
    if (!timeRemaining) {
      return (
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Badge variant="destructive" className="flex items-center space-x-1 text-xs">
            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span>{isMobile ? 'Expired' : 'Trial Expired'}</span>
          </Badge>
          <Button 
            size={isMobile ? "sm" : "sm"} 
            onClick={onUpgrade} 
            className="bg-emerald-500 hover:bg-emerald-600 text-xs px-2 sm:px-3"
          >
            {isMobile ? 'Upgrade' : 'Upgrade Now'}
          </Button>
        </div>
      );
    }

    let badgeVariant = 'default';
    let icon = <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />;
    
    if (timeRemaining.urgency === 'high') {
      badgeVariant = 'destructive';
      icon = <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />;
    } else if (timeRemaining.urgency === 'medium') {
      badgeVariant = 'secondary';
      icon = <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />;
    }

    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
        <Badge variant={badgeVariant as any} className="flex items-center space-x-1 text-xs">
          {icon}
          <span>{isMobile ? timeRemaining.text.replace('Trial: ', '') : `Trial: ${timeRemaining.text}`}</span>
        </Badge>
        {timeRemaining.urgency !== 'low' && (
          <Button 
            size={isMobile ? "sm" : "sm"} 
            onClick={onUpgrade} 
            className="bg-emerald-500 hover:bg-emerald-600 text-xs px-2 sm:px-3"
          >
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      <Badge variant="outline" className="text-red-300 border-red-300 text-xs">
        No Access
      </Badge>
      <Button 
        size={isMobile ? "sm" : "sm"} 
        onClick={onUpgrade} 
        className="bg-emerald-500 hover:bg-emerald-600 text-xs px-2 sm:px-3"
      >
        Subscribe
      </Button>
    </div>
  );
};

export default SubscriptionStatusWidget;
