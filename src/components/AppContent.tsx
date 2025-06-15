
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import AuthPage from './AuthPage';
import LandingPage from './LandingPage';
import SubscriptionPage from './SubscriptionPage';

const AppContent = () => {
  const { user, loading, subscription, checkSubscription } = useAuth();
  const [currentView, setCurrentView] = useState('landing');

  // Set currentView based on auth and subscription state
  useEffect(() => {
    // Logging for debugging state transitions
    console.log('AppContent: Auth state changed', { 
      user: user?.email, 
      loading, 
      subscription: subscription
        ? {
            subscribed: subscription.subscribed,
            is_trial_active: subscription.is_trial_active,
            has_access: subscription.has_access,
            trial_end: subscription.trial_end,
          }
        : null,
      currentView,
    });

    if (loading) {
      // Remain in loading screen until ready
      return;
    }

    if (!user) {
      if (currentView !== 'landing') setCurrentView('landing');
      return;
    }

    // User exists, but subscription might still be loading
    if (!subscription) {
      // We'll show checking subscription status below (not landing)
      return;
    }

    // User has access (paid or on trial)
    if (subscription.has_access) {
      if (currentView !== 'dashboard') {
        console.log('AppContent: User has access, go to dashboard.');
        setCurrentView('dashboard');
      }
      return;
    }

    // No access: show subscription page
    if (currentView !== 'subscription') {
      console.log('AppContent: User lacks access, go to subscription page.');
      setCurrentView('subscription');
    }
  }, [user, loading, subscription, currentView]);

  // Periodically refresh subscription status for logged in users
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      checkSubscription();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Always show loading state while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // After login, if subscription info still missing, show intermediate loading
  if (user && !subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Checking subscription status...</div>
      </div>
    );
  }

  if (currentView === 'landing') {
    return <LandingPage onNavigate={setCurrentView} />;
  }
  if (currentView === 'auth') {
    return <AuthPage onNavigate={setCurrentView} />;
  }
  if (currentView === 'subscription') {
    return <SubscriptionPage onNavigate={setCurrentView} />;
  }
  if (currentView === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={() => setCurrentView('landing')} />;
  }
  
  // Fallback (should never render)
  return <LandingPage onNavigate={setCurrentView} />;
};

export default AppContent;
