import React, { useState, lazy, Suspense } from 'react';
import { TrendingUp, RefreshCw, Bell, Settings, LogOut, CreditCard, Users, Shield, Menu, X } from 'lucide-react';
import UserProfile from './UserProfile';
import SubscriptionStatusWidget from './SubscriptionStatusWidget';
import TrialExpirationBanner from './TrialExpirationBanner';
import MobileLoadingScreen from './MobileLoadingScreen';
import DashboardStats from './DashboardStats';

import { ProductionConnectionStatus } from './ProductionConnectionStatus';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '../contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PullToRefresh } from './PullToRefresh';
import { NotificationCenter } from './NotificationCenter';
import { SettingsDialog } from './SettingsDialog';
import { StorageDiagnostics } from './StorageDiagnostics';
import { TestSignalGenerator } from './TestSignalGenerator';
import BatteryOptimizationGuide from './BatteryOptimizationGuide';
import PushNotificationTester from './PushNotificationTester';
import FCMSetupGuide from './FCMSetupGuide';
import { BackgroundPushTester } from './BackgroundPushTester';
import { RealTimeSignalTester } from './RealTimeSignalTester';
import { UnifiedConnectionStatus } from './UnifiedConnectionStatus';
import { RealTimeStatus } from './RealTimeStatus';
import { UserMenu } from './UserMenu';

// Lazy load heavy components
const LazyTradingSignals = lazy(() => import('./LazyTradingSignals'));
const LazyExpiredSignals = lazy(() => import('./LazyExpiredSignals'));

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onNavigateToAffiliate?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToSubscription?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Dashboard = ({ user, onLogout, onNavigateToAffiliate, onNavigateToAdmin, onNavigateToSubscription, activeTab: propActiveTab, onTabChange }: DashboardProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState('signals');
  const activeTab = propActiveTab || internalActiveTab;
  const [refreshing, setRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const { profile, fetchProfile } = useProfile();
  const { subscription, createCheckout, openCustomerPortal, signOut } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { signals, loading, lastUpdate, signalDistribution } = useTradingSignals();

  console.log('Dashboard: User is admin:', isAdmin);

  React.useEffect(() => {
    const onUpdated = () => fetchProfile();
    window.addEventListener('profile:updated', onUpdated as EventListener);
    return () => window.removeEventListener('profile:updated', onUpdated as EventListener);
  }, [fetchProfile]);

  // Calculate real statistics from signals data
  const calculateStats = () => {
    const activeSignalsCount = signals.length;
    const totalSignalsCount = 27; // MAX_ACTIVE_SIGNALS from useTradingSignals (matches available pairs)
    
    // Calculate average confidence from all active signals
    const avgConfidence = signals.length > 0 
      ? Math.round(signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length)
      : 0;
    
    // Format last update time
    const formattedLastUpdate = lastUpdate || 'Never';
    
    return {
      activeSignalsCount,
      totalSignalsCount,
      avgConfidence,
      lastUpdateTime: formattedLastUpdate,
      isAutomated: true
    };
  };

  const stats = calculateStats();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add haptic feedback for mobile
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
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
      } else {
        console.log('Dashboard: Logout successful');
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
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
    }
  };

  const navigateToAffiliate = () => {
    if (onNavigateToAffiliate) {
      onNavigateToAffiliate();
    }
  };

  const navigateToAdmin = () => {
    if (onNavigateToAdmin) {
      onNavigateToAdmin();
    }
  };

  const handleNotificationClick = () => {
    setProfileOpen(true);
    // TODO: Could add logic to directly open the push notifications tab
  };

  const tabItems = [
    { id: 'signals', label: 'Trading Signals', shortLabel: 'Signals' },
    { id: 'expired', label: 'Expired', shortLabel: 'Expired' },
    { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
    ...(isAdmin ? [{ id: 'diagnostics', label: 'Tools', shortLabel: 'Tools', icon: Settings }] : []),
    ...(isAdmin ? [{ id: 'testing', label: 'Test', shortLabel: 'Test', icon: TrendingUp }] : []),
    { id: 'subscription', label: 'Subscription', shortLabel: 'Sub', icon: CreditCard },
    { id: 'affiliate', label: 'Affiliate', shortLabel: 'Affiliate', icon: Users },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Dashboard', shortLabel: 'Admin', icon: Shield }] : [])
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === 'subscription') {
      onNavigateToSubscription?.();
    } else if (tabId === 'affiliate') {
      onNavigateToAffiliate?.();
    } else if (tabId === 'admin') {
      onNavigateToAdmin?.();
    } else if (tabId === 'settings') {
      // Trigger the hidden settings dialog
      const settingsTrigger = document.getElementById('settings-trigger');
      if (settingsTrigger) {
        settingsTrigger.click();
      }
    } else {
      if (onTabChange) {
        onTabChange(tabId);
      } else {
        setInternalActiveTab(tabId);
      }
    }
  };

  const MobileNavigation = () => (
    <div className="md:hidden">
      <Sheet modal={true}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="text-white">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="bottom" 
          className="h-[80svh] bg-slate-900/95 backdrop-blur-sm border-white/10"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">Navigation</h3>
            </div>
            
            {/* Scrollable Navigation Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {tabItems.map(tab => (
                <SheetClose asChild key={tab.id}>
                  <Button
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    className={`w-full justify-start text-left ${
                      activeTab === tab.id
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
                    <span>{tab.label}</span>
                  </Button>
                </SheetClose>
              ))}
            </div>

            {/* Fixed Sign Out Button */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <SheetClose asChild>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  const DesktopNavigation = () => (
    <div className="hidden md:flex space-x-8">
      {tabItems.map(tab => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Mobile-First Top Navigation */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-3 sm:px-6 pt-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and status */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold text-white truncate">
                <span className="hidden sm:inline">ForexAlert Pro</span>
                <span className="sm:hidden">FAP</span>
              </span>
            </div>
            
            {/* Admin indicator */}
            <div className="flex items-center space-x-2">
              {isAdmin && (
                <div className="flex items-center space-x-1 bg-red-500/20 px-2 py-1 rounded-full">
                  <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />
                  <span className="text-red-400 text-xs font-medium hidden sm:inline">Admin</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Actions and user info */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Subscription Status Widget - Responsive */}
            <div className="hidden sm:block">
              <SubscriptionStatusWidget
                subscription={subscription}
                onUpgrade={handleUpgrade}
                onManageSubscription={handleManageSubscription}
              />
            </div>
            
            {/* Action buttons - Desktop */}
            <div className="hidden sm:flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 text-gray-400 hover:text-white transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-6 w-6 md:h-5 md:w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Notification Center */}
              <NotificationCenter>
                <button className="p-2.5 text-gray-400 hover:text-white transition-colors" aria-label="Notifications">
                  <Bell className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </NotificationCenter>

              {/* Settings */}
              <SettingsDialog>
                <button className="p-2.5 text-gray-400 hover:text-white transition-colors" aria-label="Settings">
                  <Settings className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </SettingsDialog>
            </div>

            {/* User profile and Desktop logout button */}
            <div className="flex items-center space-x-2">
              <UserMenu
                profile={profile}
                user={user}
                onLogout={handleLogout}
                onUpgrade={handleUpgrade}
                onManageSubscription={handleManageSubscription}
                loggingOut={loggingOut}
                onProfileUpdate={() => {
                  // Refresh profile data when updated
                  setTimeout(() => window.location.reload(), 1000);
                }}
              />
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800/50"
                aria-label="Sign Out"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
              
              {/* Mobile menu trigger - only on mobile */}
              <div className="sm:hidden">
                <MobileNavigation />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile subscription status */}
        <div className="sm:hidden mt-2 flex justify-center">
          <SubscriptionStatusWidget
            subscription={subscription}
            onUpgrade={handleUpgrade}
            onManageSubscription={handleManageSubscription}
          />
        </div>
      </nav>

      {/*UserProfile Modal */}
      <UserProfile open={profileOpen} onOpenChange={setProfileOpen} />
      
      {/* Hidden Settings Trigger */}
      <SettingsDialog>
        <button
          id="settings-trigger"
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </SettingsDialog>

      {/* Desktop Tab Navigation */}
      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10 hidden md:block">
        <div className="px-6">
          <DesktopNavigation />
        </div>
      </div>

      {/* Mobile Tab Navigation using Tabs component */}
      <div className="md:hidden bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="px-3 sm:px-6 py-2">
          <Tabs value={activeTab} onValueChange={onTabChange || setInternalActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'} bg-white/10 border border-white/20 p-0 gap-0 h-12 rounded-md overflow-hidden`}>
              <TabsTrigger 
                value="signals" 
                className="text-xs text-gray-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:shadow-none rounded-sm px-2 py-1 h-8 overflow-hidden"
              >
                Signals
              </TabsTrigger>
              <TabsTrigger 
                value="expired"
                className="text-xs text-gray-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:shadow-none rounded-sm px-2 py-1 h-8 overflow-hidden"
              >
                Expired
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger 
                  value="diagnostics"
                  className="text-xs text-gray-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:shadow-none rounded-sm px-2 py-1 h-8 overflow-hidden"
                >
                  Tools
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger 
                  value="testing"
                  className="text-xs text-gray-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:shadow-none rounded-sm px-2 py-1 h-8 overflow-hidden"
                >
                  Test
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Dashboard Stats Slider - Mobile Only with Real Data - Only for Active Signals */}
      {activeTab === 'signals' && (
        <DashboardStats 
          activeSignalsCount={stats.activeSignalsCount}
          totalSignalsCount={stats.totalSignalsCount}
          avgConfidence={stats.avgConfidence}
          lastUpdateTime={stats.lastUpdateTime}
          isAutomated={stats.isAutomated}
          loading={loading}
        />
      )}


      {/* Content Area - With Pull to Refresh for Mobile */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="p-3 sm:p-6">
          {/* Connection Status */}
          <ProductionConnectionStatus />
          
          {/* Trial Expiration Banner */}
          {!bannerDismissed && (
            <TrialExpirationBanner
              subscription={subscription}
              onUpgrade={handleUpgrade}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          <Suspense fallback={<MobileLoadingScreen message="Loading content..." />}>
            {activeTab === 'signals' && <LazyTradingSignals />}
            {activeTab === 'expired' && <LazyExpiredSignals />}
            {activeTab === 'diagnostics' && (
              <div className="flex justify-center">
                <StorageDiagnostics />
              </div>
            )}
            {activeTab === 'testing' && (
              <div className="space-y-4">
                  <RealTimeSignalTester />
                  <FCMSetupGuide />
                  <BatteryOptimizationGuide />
                  <BackgroundPushTester />
                  <PushNotificationTester />
                <div className="flex justify-center">
                  <TestSignalGenerator />
                </div>
              </div>
            )}
          </Suspense>
        </div>
      </PullToRefresh>
    </div>
  );
};

export default Dashboard;
