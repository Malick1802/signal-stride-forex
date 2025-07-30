import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSignalNotifications } from '@/hooks/useSignalNotifications';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import MobileLoadingScreen from './MobileLoadingScreen';
import LazyLoadFallback from './LazyLoadFallback';
import ProgressiveAuthProvider from './ProgressiveAuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// Lazy load heavy components with error boundaries
const LazyDashboard = lazy(() => import('./LazyDashboard').catch(error => {
  console.error('🚨 Failed to load Dashboard:', error);
  return { default: () => <LazyLoadFallback error={error} componentName="Dashboard" /> };
}));

const LazySubscriptionPage = lazy(() => import('./SubscriptionPage').catch(error => {
  console.error('🚨 Failed to load SubscriptionPage:', error);
  return { default: () => <LazyLoadFallback error={error} componentName="Subscription" /> };
}));

const LazyAffiliatePage = lazy(() => import('./AffiliatePage').catch(error => {
  console.error('🚨 Failed to load AffiliatePage:', error);
  return { default: () => <LazyLoadFallback error={error} componentName="Affiliate" /> };
}));

const LazyAdminDashboard = lazy(() => import('./AdminDashboard').catch(error => {
  console.error('🚨 Failed to load AdminDashboard:', error);
  return { default: () => <LazyLoadFallback error={error} componentName="Admin Dashboard" /> };
}));

type ViewType = 'landing' | 'auth' | 'dashboard' | 'subscription' | 'affiliate' | 'admin';

const AppContent = () => {
  const { user, loading, subscription, session } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [isAdmin, setIsAdmin] = useState(false);

  // Initialize signal notifications for authenticated users
  useSignalNotifications();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user && session) {
        try {
          console.log('AppContent: Checking admin status for user:', user.email);
          
          // Use direct Supabase query instead of Netlify function
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

          if (error) {
            console.error('AppContent: Error checking admin status:', error);
            setIsAdmin(false);
            return;
          }

          const hasAdminRole = !!data;
          setIsAdmin(hasAdminRole);
          console.log('AppContent: Admin status check result:', hasAdminRole);
        } catch (error) {
          console.error('AppContent: Failed to check admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, session]);

  useEffect(() => {
    console.log('AppContent: Auth state changed', {
      user: user?.email || 'none',
      loading,
      subscription: subscription?.subscribed ? 'active' : 'none',
      currentView,
      isAdmin,
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
    });

    if (!loading) {
      if (user) {
        // Only navigate to dashboard if currently on landing or auth page
        if (currentView === 'landing' || currentView === 'auth') {
          console.log('AppContent: User authenticated, navigating to dashboard');
          setCurrentView('dashboard');
        }
      } else {
        // Only navigate to landing if not already there
        if (currentView !== 'landing') {
          console.log('AppContent: No user, showing landing page');
          setCurrentView('landing');
        }
      }
    }
  }, [user, loading, subscription, isAdmin]); // Removed currentView from dependencies

  const handleLogout = () => {
    console.log('AppContent: Handling logout');
    setCurrentView('landing');
  };

  const navigateToSubscription = () => {
    console.log('AppContent: Navigating to subscription page');
    setCurrentView('subscription');
  };

  const navigateToAffiliate = () => {
    console.log('AppContent: Navigating to affiliate page');
    setCurrentView('affiliate');
  };

  const navigateToAdmin = () => {
    console.log('AppContent: Navigating to admin page');
    setCurrentView('admin');
  };

  // Create navigation handlers that match the expected string type
  const handleLandingNavigation = (view: string) => {
    console.log('AppContent: Landing navigation to:', view);
    setCurrentView(view as ViewType);
  };

  const handleAuthNavigation = (view: string) => {
    console.log('AppContent: Auth navigation to:', view);
    setCurrentView(view as ViewType);
  };

  if (loading) {
    return <MobileLoadingScreen message="Initializing ForexAlert Pro..." />;
  }

  console.log('AppContent: Rendering current view:', currentView, {
    user: user ? 'authenticated' : 'none',
    loading,
    subscription: subscription?.subscribed ? 'active' : 'none'
  });

  // Emergency fallback - should always be visible
  if (!user && !loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '20px',
        fontSize: '18px',
        zIndex: 9999
      }}>
        <h1>Emergency Fallback - No User</h1>
        <p>CurrentView: {currentView}</p>
        <p>Loading: {loading ? 'true' : 'false'}</p>
        <LandingPage onNavigate={handleLandingNavigation} />
      </div>
    );
  }

  if (user && !loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '20px',
        fontSize: '18px',
        zIndex: 9999
      }}>
        <h1>Emergency Fallback - User Authenticated</h1>
        <p>CurrentView: {currentView}</p>
        <p>User: {user.email}</p>
        <p>Loading: {loading ? 'true' : 'false'}</p>
        <p>Admin: {isAdmin ? 'true' : 'false'}</p>
        
        {/* Try to render dashboard directly */}
        <Suspense fallback={<div>Loading dashboard...</div>}>
          <LazyDashboard
            user={user}
            onLogout={handleLogout}
            onNavigateToAffiliate={navigateToAffiliate}
            onNavigateToAdmin={navigateToAdmin}
            onNavigateToSubscription={navigateToSubscription}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <ProgressiveAuthProvider>
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Debug information - will be visible on screen */}
        <div className="fixed top-4 left-4 bg-black/50 text-white p-2 rounded text-xs z-50">
          View: {currentView} | User: {user ? 'Yes' : 'No'} | Loading: {loading ? 'Yes' : 'No'}
        </div>
        
        {currentView === 'landing' && (
          <LandingPage onNavigate={handleLandingNavigation} />
        )}
        
        {currentView === 'auth' && (
          <AuthPage onNavigate={handleAuthNavigation} />
        )}
        
        {user && (
          <Suspense fallback={<MobileLoadingScreen message={`Loading ${currentView}...`} />}>
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
              <LazySubscriptionPage onNavigate={handleAuthNavigation} />
            )}
            {currentView === 'affiliate' && (
              <LazyAffiliatePage onNavigate={handleAuthNavigation} />
            )}
            {currentView === 'admin' && isAdmin && (
              <LazyAdminDashboard onNavigate={handleAuthNavigation} />
            )}
          </Suspense>
        )}
      </div>
    </ProgressiveAuthProvider>
  );
};

export default AppContent;
