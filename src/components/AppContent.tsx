
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import AuthPage from './AuthPage';
import LandingPage from './LandingPage';
import SubscriptionPage from './SubscriptionPage';

const AppContent = () => {
  const { user, loading, subscription, checkSubscription } = useAuth();
  const [currentView, setCurrentView] = useState('landing');
  const [manualNavigation, setManualNavigation] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Set currentView based on auth and subscription state
  useEffect(() => {
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
      manualNavigation,
    });

    if (loading) {
      return;
    }

    if (!user) {
      if (currentView !== 'landing') setCurrentView('landing');
      return;
    }

    // For logged in users, we need to wait for subscription data
    if (subscription === null) {
      // Show loading state while subscription is being fetched
      console.log('AppContent: Waiting for subscription data to load');
      return;
    }

    // Now we have subscription data, decide where to go
    if (subscription.has_access) {
      // Don't redirect if user manually navigated to subscription page
      if (currentView !== 'dashboard' && currentView !== 'subscription') {
        console.log('AppContent: User has access, go to dashboard.');
        setCurrentView('dashboard');
      } else if (currentView === 'subscription' && !manualNavigation) {
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
  }, [user, loading, subscription, currentView, manualNavigation]);

  // Listen for navigation events from Dashboard
  useEffect(() => {
    const handleNavigateToSubscription = () => {
      setManualNavigation(true);
      setCurrentView('subscription');
    };

    window.addEventListener('navigate-to-subscription', handleNavigateToSubscription);
    return () => window.removeEventListener('navigate-to-subscription', handleNavigateToSubscription);
  }, []);

  // Reset manual navigation flag when view changes to non-subscription views
  useEffect(() => {
    if (currentView !== 'subscription') {
      setManualNavigation(false);
    }
  }, [currentView]);

  // Reduced refresh interval - only refresh every 2 minutes for logged in users
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      checkSubscription();
    }, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Show loading state while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show subscription loading state for logged in users without subscription data
  if (user && subscription === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading subscription status...</div>
          <div className="text-gray-400">Please wait while we verify your account</div>
        </div>
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
  
  // Fallback
  return <LandingPage onNavigate={setCurrentView} />;
};

export default AppContent;
