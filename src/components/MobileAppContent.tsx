import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import SubscriptionPage from './SubscriptionPage';
import AffiliatePage from './AffiliatePage';
import AdminDashboard from './AdminDashboard';

// Mobile-optimized AppContent that loads components synchronously
const MobileAppContent = () => {
  const { user, loading, subscription } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'subscription' | 'affiliate' | 'admin'>('landing');
  const [isAdmin, setIsAdmin] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  console.log('📱 MobileAppContent: Rendering', {
    user: user?.email || 'none',
    loading,
    subscription: subscription ? 'active' : 'none',
    currentView,
    isAdmin,
    platform: Capacitor.getPlatform()
  });

  // Check admin status
  useEffect(() => {
    if (!user?.email) return;

    const checkAdmin = async () => {
      try {
        console.log('📱 MobileAppContent: Checking admin status for', user.email);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('📱 Admin check error:', error);
          return;
        }

        const adminStatus = !!data;
        console.log('📱 Admin status:', adminStatus);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('📱 Admin check failed:', error);
      }
    };

    checkAdmin();
  }, [user]);

  // Handle navigation based on auth state
  useEffect(() => {
    try {
      console.log('📱 Navigation logic:', { user: !!user, loading, subscription });

      if (loading) {
        console.log('📱 Still loading, staying on current view');
        return;
      }

      if (!user) {
        console.log('📱 No user, navigating to landing');
        setCurrentView('landing');
        return;
      }

      // User is authenticated
      console.log('📱 User authenticated, navigating to dashboard');
      setCurrentView('dashboard');
    } catch (error) {
      console.error('📱 Navigation error:', error);
      setInitError(`Navigation failed: ${error}`);
    }
  }, [user, loading, subscription]);

  // Show loading screen during initialization
  if (loading) {
    console.log('📱 Showing loading screen');
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-6 mx-auto"></div>
          <h1 className="text-xl font-bold mb-2">ForexAlert Pro</h1>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    console.error('📱 Showing error screen:', initError);
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-xl font-bold mb-4">Initialization Error</h1>
          <p className="text-gray-300 mb-6">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  // Navigation handlers
  const handleLogout = async () => {
    try {
      console.log('📱 Logging out...');
      await supabase.auth.signOut();
      setCurrentView('landing');
    } catch (error) {
      console.error('📱 Logout error:', error);
    }
  };

  const navigateToSubscription = () => {
    console.log('📱 Navigating to subscription');
    setCurrentView('subscription');
  };

  const navigateToAffiliate = () => {
    console.log('📱 Navigating to affiliate');
    setCurrentView('affiliate');
  };

  const navigateToAdmin = () => {
    console.log('📱 Navigating to admin');
    setCurrentView('admin');
  };

  const handleLandingNavigation = (view: 'auth' | 'subscription' | 'affiliate') => {
    console.log('📱 Landing navigation to:', view);
    setCurrentView(view);
  };

  const handleAuthNavigation = (view: 'landing' | 'dashboard') => {
    console.log('📱 Auth navigation to:', view);
    setCurrentView(view);
  };

  // Render current view
  console.log('📱 Rendering view:', currentView);

  try {
    switch (currentView) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={handleLandingNavigation}
          />
        );

      case 'auth':
        return (
          <AuthPage
            onNavigate={handleAuthNavigation}
          />
        );

      case 'dashboard':
        return (
          <Dashboard
            user={user}
            onLogout={handleLogout}
          />
        );

      case 'subscription':
        return (
          <SubscriptionPage
            onNavigate={(view) => setCurrentView(view as any)}
          />
        );

      case 'affiliate':
        return (
          <AffiliatePage
            onNavigate={(view) => setCurrentView(view as any)}
          />
        );

      case 'admin':
        return isAdmin ? (
          <AdminDashboard
            onNavigate={(view) => setCurrentView(view as any)}
          />
        ) : (
          <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
            <div className="text-center">
              <h1 className="text-xl font-bold mb-4">Access Denied</h1>
              <p className="text-gray-300 mb-6">You don't have admin privileges.</p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );

      default:
        console.warn('📱 Unknown view:', currentView);
        return (
          <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
            <div className="text-center">
              <h1 className="text-xl font-bold mb-4">Unknown View</h1>
              <p className="text-gray-300 mb-6">Current view: {currentView}</p>
              <button
                onClick={() => setCurrentView('landing')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg"
              >
                Go to Landing
              </button>
            </div>
          </div>
        );
    }
  } catch (error) {
    console.error('📱 Render error:', error);
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-xl font-bold mb-4">Render Error</h1>
          <p className="text-gray-300 mb-6">Failed to render {currentView} view</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
};

export default MobileAppContent;