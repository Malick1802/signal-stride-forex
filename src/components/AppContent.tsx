
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
    if (!loading) {
      if (user) {
        // Check if user has access (subscription or trial)
        if (subscription?.has_access) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('subscription');
        }
      } else {
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
