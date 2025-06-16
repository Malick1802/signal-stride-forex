
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import AffiliatePage from './AffiliatePage';
import AdminPage from './AdminPage';

const AppContent = () => {
  const { user, loading, subscription } = useAuth();
  const { trackSignup, trackSubscription } = useReferralTracking();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [currentView, setCurrentView] = useState('dashboard');
  const [manualNavigation, setManualNavigation] = useState(false);
  const [explicitAuthNavigation, setExplicitAuthNavigation] = useState(false);

  // Initialize referral tracking
  useReferralTracking();

  useEffect(() => {
    console.log('AppContent: Auth state changed', {
      user: user?.email || 'none',
      loading,
      subscription,
      currentView,
      manualNavigation,
      explicitAuthNavigation,
      isAdmin
    });

    if (loading || adminLoading) return;

    // Handle authenticated users
    if (user) {
      // If user just signed up, track the signup
      if (!manualNavigation && !explicitAuthNavigation) {
        trackSignup(user.id);
      }
      
      // Default to dashboard for authenticated users
      if (!manualNavigation) {
        setCurrentView('dashboard');
      }
    } else {
      // Show landing page for unauthenticated users
      if (!explicitAuthNavigation) {
        setCurrentView('landing');
      }
    }
  }, [user, loading, subscription, manualNavigation, explicitAuthNavigation, trackSignup, adminLoading, isAdmin]);

  // Handle subscription events for commission tracking
  useEffect(() => {
    if (user && subscription?.subscribed) {
      // Estimate subscription amount based on tier (you might want to get this from Stripe)
      const subscriptionAmount = subscription.subscription_tier === 'premium' ? 99 : 49;
      trackSubscription(user.id, subscriptionAmount);
    }
  }, [user, subscription?.subscribed, trackSubscription]);

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const handleNavigation = (view: string, manual = true) => {
    setManualNavigation(manual);
    setExplicitAuthNavigation(view === 'auth');
    setCurrentView(view);
  };

  const handleLogout = () => {
    // This will be handled by the Dashboard component itself
    console.log('Logout requested');
  };

  // Render based on current view
  switch (currentView) {
    case 'auth':
      return <AuthPage onNavigate={(view: string) => handleNavigation(view)} />;
    case 'affiliate':
      return <AffiliatePage onNavigate={(view: string) => handleNavigation(view)} />;
    case 'admin':
      return isAdmin ? (
        <AdminPage onNavigate={(view: string) => handleNavigation(view)} />
      ) : (
        <LandingPage onNavigate={(view: string) => handleNavigation(view)} />
      );
    case 'dashboard':
      return user ? (
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          onNavigateToAffiliate={() => handleNavigation('affiliate')}
          onNavigateToAdmin={isAdmin ? () => handleNavigation('admin') : undefined}
        />
      ) : (
        <LandingPage onNavigate={(view: string) => handleNavigation(view)} />
      );
    case 'landing':
    default:
      return <LandingPage onNavigate={(view: string) => handleNavigation(view)} />;
  }
};

export default AppContent;
