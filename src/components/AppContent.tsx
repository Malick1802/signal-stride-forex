
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
  const [currentView, setCurrentView] = useState('landing');

  // Initialize referral tracking
  useReferralTracking();

  useEffect(() => {
    console.log('AppContent: Auth state changed', {
      user: user?.email || 'none',
      loading,
      subscription,
      currentView
    });

    if (loading) return;

    // Simple navigation logic based on auth state
    if (user) {
      // Track signup for new users (only once)
      if (currentView !== 'dashboard') {
        trackSignup(user.id);
      }
      
      // Show dashboard for authenticated users
      setCurrentView('dashboard');
    } else {
      // Show landing page for unauthenticated users
      if (currentView === 'dashboard') {
        setCurrentView('landing');
      }
    }
  }, [user, loading, trackSignup]);

  // Handle subscription events for commission tracking
  useEffect(() => {
    if (user && subscription?.subscribed) {
      // Estimate subscription amount based on tier
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

  const handleNavigation = (view: string) => {
    console.log('AppContent: Navigating to:', view);
    setCurrentView(view);
  };

  // Render based on current view
  switch (currentView) {
    case 'auth':
      return <AuthPage onNavigate={handleNavigation} />;
    case 'affiliate':
      return <AffiliatePage onNavigate={handleNavigation} />;
    case 'dashboard':
      return user ? (
        <Dashboard 
          user={user} 
          onLogout={() => {}} // Will be handled by Dashboard component
          onNavigateToAffiliate={() => handleNavigation('affiliate')} 
        />
      ) : (
        <LandingPage onNavigate={handleNavigation} />
      );
    case 'landing':
    default:
      return <LandingPage onNavigate={handleNavigation} />;
  }
};

export default AppContent;
