
import React from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from './ui/button';
import { getTimeRemaining } from '../utils/subscriptionUtils';

interface TrialExpirationBannerProps {
  subscription: any;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const TrialExpirationBanner: React.FC<TrialExpirationBannerProps> = ({
  subscription,
  onUpgrade,
  onDismiss
}) => {
  if (!subscription?.is_trial_active) return null;
  
  const timeRemaining = getTimeRemaining(subscription.trial_end);
  
  if (!timeRemaining || timeRemaining.urgency === 'low') return null;

  const bgColor = timeRemaining.urgency === 'high' 
    ? 'bg-red-500/20 border-red-500/30' 
    : 'bg-yellow-500/20 border-yellow-500/30';
  
  const textColor = timeRemaining.urgency === 'high' 
    ? 'text-red-300' 
    : 'text-yellow-300';

  return (
    <div className={`${bgColor} border backdrop-blur-sm p-4 mb-6 rounded-lg flex items-center justify-between`}>
      <div className="flex items-center space-x-3">
        {timeRemaining.urgency === 'high' ? (
          <AlertTriangle className={`h-5 w-5 ${textColor}`} />
        ) : (
          <Clock className={`h-5 w-5 ${textColor}`} />
        )}
        <div>
          <div className={`font-semibold ${textColor}`}>
            {timeRemaining.urgency === 'high' ? 'Trial Ending Soon!' : 'Trial Reminder'}
          </div>
          <div className="text-white text-sm">
            Your trial expires in {timeRemaining.text}. Upgrade now to continue accessing all features.
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          onClick={onUpgrade}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
        >
          Upgrade Now
        </Button>
        <Button
          onClick={onDismiss}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TrialExpirationBanner;
