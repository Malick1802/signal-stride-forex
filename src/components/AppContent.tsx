
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import AuthPage from './AuthPage';
import LandingPage from './LandingPage';
import SubscriptionPage from './SubscriptionPage';

const AppContent = () => {
  const { user, loading, subscription, checkSubscription } = useAuth();
  const [currentView, setCurrentView] = useState('landing');

  useEffect(() => {
    console.log('AppContent: Auth state changed', { 
      user: user?.email, 
      loading, 
      subscription: subscription ? {
        subscribed: subscription.subscribed,
        is_trial_active: subscription.is_trial_active,
        has_access: subscription.has_access,
        trial_end: subscription.trial_end
      } : null 
    });

    if (!loading) {
      if (user) {
        // Wait a moment for subscription to be loaded
        if (subscription) {
          // Check if user has access (subscription or trial)
          if (subscription.has_access) {
            console.log('AppContent: User has access, showing dashboard');
            setCurrentView('dashboard');
          } else {
            console.log('AppContent: User has no access, showing subscription page');
            setCurrentView('subscription');
          }
        } else {
          // If subscription is null but user exists, wait for it to load
          console.log('AppContent: User exists but subscription not loaded yet, staying on current view');
        }
      } else {
        console.log('AppContent: No user, showing landing page');
        setCurrentView('landing');
      }
    }
  }, [user, loading, subscription]);

  // Refresh subscription status periodically
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        checkSubscription();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user, checkSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show loading if user exists but subscription hasn't been checked yet
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

  return <LandingPage onNavigate={setCurrentView} />;
};

export default AppContent;
