import React, { useState } from 'react';
import { TrendingUp, RefreshCw, Bell, Settings, LogOut, CreditCard } from 'lucide-react';
import TradingSignals from './TradingSignals';
import ExpiredSignals from './ExpiredSignals';
import UserProfile from './UserProfile';
import SubscriptionStatusWidget from './SubscriptionStatusWidget';
import TrialExpirationBanner from './TrialExpirationBanner';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('signals');
  const [refreshing, setRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { profile } = useProfile();
  const { subscription, createCheckout, openCustomerPortal, signOut } = useAuth();

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    console.log('Dashboard: Starting logout process');
    
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Dashboard: Logout error:', error);
        // You could add a toast notification here for error handling
      } else {
        console.log('Dashboard: Logout successful');
        // Auth state change will handle navigation automatically
      }
    } catch (error) {
      console.error('Dashboard: Logout failed:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const result = await createCheckout();
      if (result.error) {
        console.error('Checkout error:', result.error);
      } else if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await openCustomerPortal();
      if (result.error) {
        console.error('Portal error:', result.error);
      } else if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    }
  };

  const navigateToSubscription = () => {
    // This will trigger the parent component to show subscription page
    window.dispatchEvent(new CustomEvent('navigate-to-subscription'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Top Navigation */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold text-white">ForexSignal Pro</span>
            </div>
            <div className="flex items-center space-x-1 bg-emerald-500/20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-sm font-medium">Live</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Subscription Status Widget */}
            <SubscriptionStatusWidget
              subscription={subscription}
              onUpgrade={handleUpgrade}
              onManageSubscription={handleManageSubscription}
            />
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Profile"
              onClick={() => setProfileOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="mr-2">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                      {profile?.full_name
                        ? profile.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                        : 'U'}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-white font-medium truncate max-w-[120px]">{profile?.full_name || user.email}</div>
                  <div className="text-emerald-400 text-xs truncate">{user.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Log out"
              >
                <LogOut className={`h-5 w-5 ${loggingOut ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* UserProfile Modal */}
      <UserProfile open={profileOpen} onOpenChange={setProfileOpen} />

      {/* Tab Navigation */}
      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'signals', label: 'Active Signals' },
              { id: 'expired', label: 'Expired Signals' },
              { id: 'subscription', label: 'Subscription', icon: CreditCard }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'subscription') {
                    navigateToSubscription();
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Trial Expiration Banner */}
        {!bannerDismissed && (
          <TrialExpirationBanner
            subscription={subscription}
            onUpgrade={handleUpgrade}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        {activeTab === 'signals' && <TradingSignals />}
        {activeTab === 'expired' && <ExpiredSignals />}
      </div>
    </div>
  );
};

export default Dashboard;
