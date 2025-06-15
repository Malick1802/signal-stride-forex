
import React from 'react';
import { Clock, Crown, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getTimeRemaining } from '../utils/subscriptionUtils';

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
  if (!subscription) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-white/20 rounded px-3 py-1">
          <span className="text-gray-300 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (subscription.subscribed) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="success" className="flex items-center space-x-1">
          <Crown className="h-3 w-3" />
          <span>{subscription.subscription_tier}</span>
        </Badge>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onManageSubscription}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          Manage
        </Button>
      </div>
    );
  }

  if (subscription.is_trial_active) {
    const timeRemaining = getTimeRemaining(subscription.trial_end);
    
    if (!timeRemaining) {
      return (
        <div className="flex items-center space-x-2">
          <Badge variant="destructive" className="flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Trial Expired</span>
          </Badge>
          <Button size="sm" onClick={onUpgrade} className="bg-emerald-500 hover:bg-emerald-600">
            Upgrade Now
          </Button>
        </div>
      );
    }

    let badgeVariant = 'default';
    let icon = <Clock className="h-3 w-3" />;
    
    if (timeRemaining.urgency === 'high') {
      badgeVariant = 'destructive';
      icon = <AlertTriangle className="h-3 w-3" />;
    } else if (timeRemaining.urgency === 'medium') {
      badgeVariant = 'secondary';
      icon = <Clock className="h-3 w-3" />;
    }

    return (
      <div className="flex items-center space-x-2">
        <Badge variant={badgeVariant as any} className="flex items-center space-x-1">
          {icon}
          <span>Trial: {timeRemaining.text}</span>
        </Badge>
        {timeRemaining.urgency !== 'low' && (
          <Button size="sm" onClick={onUpgrade} className="bg-emerald-500 hover:bg-emerald-600">
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-red-300 border-red-300">
        No Access
      </Badge>
      <Button size="sm" onClick={onUpgrade} className="bg-emerald-500 hover:bg-emerald-600">
        Subscribe
      </Button>
    </div>
  );
};

export default SubscriptionStatusWidget;
