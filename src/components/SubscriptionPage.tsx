
import React, { useState } from 'react';
import { TrendingUp, Check, Clock, CreditCard, Settings, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTimeRemaining, formatDate } from '../utils/subscriptionUtils';

interface SubscriptionPageProps {
  onNavigate: (view: string) => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onNavigate }) => {
  const { subscription, createCheckout, openCustomerPortal, signOut, checkSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await createCheckout();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.open(result.url, '_blank');
        // Refresh subscription status after a delay to catch returning users
        setTimeout(() => {
          checkSubscription();
        }, 5000);
      }
    } catch (err) {
      setError('Failed to create checkout session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await openCustomerPortal();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (err) {
      setError('Failed to open customer portal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await checkSubscription();
    setIsLoading(false);
  };

  const getTrialTimeRemaining = () => {
    if (!subscription?.trial_end) return null;
    return getTimeRemaining(subscription.trial_end);
  };

  const getSubscriptionTimeRemaining = () => {
    if (!subscription?.subscription_end) return null;
    return getTimeRemaining(subscription.subscription_end);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {/* Always show back button for authenticated users */}
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10 touch-manipulation"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
              <h1 className="text-3xl font-bold text-white">Subscription</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Dashboard shortcut for easy navigation */}
            <button
              onClick={() => onNavigate('dashboard')}
              className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-3 sm:px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Status'}
            </button>
            <button
              onClick={() => signOut()}
              className="px-3 sm:px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Trial Status</h2>
            </div>
            {subscription?.is_trial_active ? (
              <div>
                <div className="text-emerald-400 font-semibold mb-2">✓ Active Trial</div>
                <div className="text-gray-300 text-sm">
                  Ends: {formatDate(subscription.trial_end)}
                </div>
                <div className="text-gray-300 text-sm">
                  {getTrialTimeRemaining()?.text || 'Calculating...'}
                </div>
                {getTrialTimeRemaining()?.urgency === 'high' && (
                  <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                    ⚠ Trial ending soon! Upgrade now to avoid losing access.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">
                {subscription ? 'Trial period ended' : 'Loading...'}
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center space-x-2 mb-4">
              <CreditCard className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Subscription</h2>
            </div>
            {subscription?.subscribed ? (
              <div>
                <div className="text-emerald-400 font-semibold mb-2">✓ {subscription.subscription_tier}</div>
                <div className="text-gray-300 text-sm">
                  Renews: {formatDate(subscription.subscription_end)}
                </div>
                <div className="text-gray-300 text-sm">
                  {getSubscriptionTimeRemaining()?.text || 'Active'}
                </div>
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Manage Subscription</span>
                </button>
              </div>
            ) : (
              <div className="text-gray-400">
                {subscription ? 'No active subscription' : 'Loading...'}
              </div>
            )}
          </div>
        </div>

        {/* Pricing Plan */}
        {subscription && !subscription.subscribed && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Unlimited Plan</h2>
              <p className="text-gray-300">Get unlimited access to forex trading signals</p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl p-8 text-center">
                <div className="text-4xl font-bold text-white mb-2">$29.99</div>
                <div className="text-white/80 mb-6">per month</div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center space-x-2 text-white">
                    <Check className="h-5 w-5 text-emerald-200" />
                    <span>Unlimited trading signals</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white">
                    <Check className="h-5 w-5 text-emerald-200" />
                    <span>Real-time market data</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white">
                    <Check className="h-5 w-5 text-emerald-200" />
                    <span>AI-powered analysis</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white">
                    <Check className="h-5 w-5 text-emerald-200" />
                    <span>24/7 access</span>
                  </div>
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="w-full py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Access Status */}
        <div className="mt-8 text-center">
          {subscription?.has_access ? (
            <div className="text-emerald-400 font-semibold">
              ✓ You have access to all features
            </div>
          ) : subscription ? (
            <div className="text-red-400 font-semibold">
              ⚠ Subscribe to continue using the service
            </div>
          ) : (
            <div className="text-gray-400">
              Loading subscription status...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
