import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import MobileLoadingScreen from './MobileLoadingScreen';
import ProgressiveAuthProvider from './ProgressiveAuthProvider';

// Lazy load heavy components
const LazyDashboard = lazy(() => import('./LazyDashboard'));
const LazySubscriptionPage = lazy(() => import('./SubscriptionPage'));
const LazyAffiliatePage = lazy(() => import('./AffiliatePage'));
const LazyAdminDashboard = lazy(() => import('./AdminDashboard'));

const AppContent = () => {
  const { user, loading, subscription } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'subscription' | 'affiliate' | 'admin'>('landing');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const token = await user.getIdToken();
        try {
          const response = await fetch('/.netlify/functions/check-admin', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
          console.log('AppContent: Admin status check', data);
        } catch (error) {
          console.error('AppContent: Failed to check admin status', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    console.log('AppContent: Auth state changed', {
      user: user?.email || 'none',
      loading,
      subscription: subscription?.subscribed ? 'active' : 'none',
      currentView,
      isAdmin
    });

    if (!loading) {
      if (user) {
        if (currentView === 'landing' || currentView === 'auth') {
          setCurrentView('dashboard');
        }
      } else {
        setCurrentView('landing');
      }
    }
  }, [user, loading, subscription, currentView, isAdmin]);

  const handleLogout = () => {
    setCurrentView('landing');
  };

  const navigateToSubscription = () => {
    setCurrentView('subscription');
  };

  const navigateToAffiliate = () => {
    setCurrentView('affiliate');
  };

  const navigateToAdmin = () => {
    setCurrentView('admin');
  };

  if (loading) {
    return <MobileLoadingScreen message="Initializing ForexAlert Pro..." />;
  }

  return (
    <ProgressiveAuthProvider>
      <div className="w-full min-h-screen">
        {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}
        {currentView === 'auth' && <AuthPage onNavigate={setCurrentView} />}
        
        {user && (
          <Suspense fallback={<MobileLoadingScreen message="Loading dashboard..." />}>
            {currentView === 'dashboard' && (
              <LazyDashboard
                user={user}
                onLogout={handleLogout}
                onNavigateToAffiliate={navigateToAffiliate}
                onNavigateToAdmin={navigateToAdmin}
                onNavigateToSubscription={navigateToSubscription}
              />
            )}
            {currentView === 'subscription' && (
              <LazySubscriptionPage onNavigate={setCurrentView} />
            )}
            {currentView === 'affiliate' && (
              <LazyAffiliatePage onNavigate={setCurrentView} />
            )}
            {currentView === 'admin' && isAdmin && (
              <LazyAdminDashboard onNavigate={setCurrentView} />
            )}
          </Suspense>
        )}
      </div>
    </ProgressiveAuthProvider>
  );
};

export default AppContent;
