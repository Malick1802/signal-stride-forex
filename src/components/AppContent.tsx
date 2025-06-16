
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import AffiliatePage from './AffiliatePage';

const AppContent = () => {
  const { user, loading, subscription } = useAuth();
  const { trackSignup, trackSubscription } = useReferralTracking();
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
      explicitAuthNavigation
    });

    if (loading) return;

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
  }, [user, loading, subscription, manualNavigation, explicitAuthNavigation, trackSignup]);

  // Handle subscription events for commission tracking
  useEffect(() => {
    if (user && subscription?.subscribed) {
      // Estimate subscription amount based on tier (you might want to get this from Stripe)
      const subscriptionAmount = subscription.subscription_tier === 'premium' ? 99 : 49;
      trackSubscription(user.id, subscriptionAmount);
    }
  }, [user, subscription?.subscribed, trackSubscription]);

  if (loading) {
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

  // Render based on current view
  switch (currentView) {
    case 'auth':
      return <AuthPage onBack={() => handleNavigation('landing')} />;
    case 'affiliate':
      return <AffiliatePage />;
    case 'dashboard':
      return user ? (
        <Dashboard onNavigateToAffiliate={() => handleNavigation('affiliate')} />
      ) : (
        <LandingPage onNavigateToAuth={() => handleNavigation('auth')} />
      );
    case 'landing':
    default:
      return <LandingPage onNavigateToAuth={() => handleNavigation('auth')} />;
  }
};

export default AppContent;
