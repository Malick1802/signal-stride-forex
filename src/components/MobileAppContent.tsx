import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { useSignalNotifications } from '../hooks/useSignalNotifications';

// Import components directly (no lazy loading for mobile)
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import SubscriptionPage from './SubscriptionPage';
import AffiliatePage from './AffiliatePage';
import AdminDashboard from './AdminDashboard';

// Mobile Error Boundary
class MobileErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('📱 Mobile Error Boundary caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('📱 Mobile Error Details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold mb-4">App Error</h1>
            <p className="text-gray-300 mb-6">
              Something went wrong. The app will try to recover.
            </p>
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

    return this.props.children;
  }
}

type ViewType = 'landing' | 'auth' | 'dashboard' | 'subscription' | 'affiliate' | 'admin';

const MobileAppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('📱 MobileAppContent render:', { 
    user: user?.id, 
    authLoading, 
    currentView, 
    isInitializing,
    platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
  });

  // Initialize signal notifications
  useSignalNotifications();

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        console.log('🔒 No user, setting admin to false');
        setIsAdmin(false);
        return;
      }

      try {
        console.log('🔍 Checking admin status for user:', user.id);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }

        const adminStatus = !!data;
        console.log('👤 Admin status:', adminStatus);
        setIsAdmin(adminStatus);
      } catch (err) {
        console.error('❌ Exception checking admin status:', err);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user?.id]);

  // Handle navigation logic
  useEffect(() => {
    const determineView = async () => {
      try {
        console.log('🧭 Determining view...', { user: !!user, authLoading });
        
        if (authLoading) {
          console.log('⏳ Auth still loading, waiting...');
          return;
        }

        if (!user) {
          console.log('👤 No user, showing landing page');
          setCurrentView('landing');
          setIsInitializing(false);
          return;
        }

        // Check subscription status
        console.log('💳 Checking subscription status...');
        const { data: subscriber, error: subError } = await supabase
          .from('subscribers')
          .select('subscribed, is_trial_active, trial_end')
          .eq('user_id', user.id)
          .single();

        if (subError && subError.code !== 'PGRST116') {
          console.error('❌ Error checking subscription:', subError);
          setError('Failed to load subscription data');
          setIsInitializing(false);
          return;
        }

        const hasActiveSubscription = subscriber?.subscribed || subscriber?.is_trial_active;
        console.log('💳 Subscription status:', { hasActiveSubscription, subscriber });

        if (!hasActiveSubscription) {
          console.log('💳 No active subscription, showing subscription page');
          setCurrentView('subscription');
        } else {
          console.log('✅ Active subscription found, showing dashboard');
          setCurrentView('dashboard');
        }

        setIsInitializing(false);
      } catch (err) {
        console.error('❌ Error in navigation logic:', err);
        setError('Failed to initialize app');
        setIsInitializing(false);
      }
    };

    determineView();
  }, [user, authLoading]);

  // Navigation handlers
  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    try {
      await supabase.auth.signOut();
      setCurrentView('landing');
    } catch (err) {
      console.error('❌ Logout error:', err);
      setError('Failed to logout');
    }
  };

  const navigateToSubscription = () => {
    console.log('💳 Navigating to subscription');
    setCurrentView('subscription');
  };

  const navigateToAffiliate = () => {
    console.log('🤝 Navigating to affiliate');
    setCurrentView('affiliate');
  };

  const navigateToAdmin = () => {
    console.log('⚙️ Navigating to admin');
    setCurrentView('admin');
  };

  const handleLandingNavigation = (action: string) => {
    console.log('🏠 Landing navigation:', action);
    if (action === 'auth') {
      setCurrentView('auth');
    }
  };

  const handleAuthNavigation = (action: string) => {
    console.log('🔐 Auth navigation:', action);
    if (action === 'back') {
      setCurrentView('landing');
    }
  };

  // Show loading screen during initialization
  if (isInitializing || authLoading) {
    console.log('⏳ Showing loading screen');
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mb-6 mx-auto"></div>
          <h1 className="text-xl font-bold mb-2">ForexAlert Pro</h1>
          <p className="text-gray-300 mb-4">Loading...</p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-emerald-400 h-2 rounded-full w-3/4 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error screen if something went wrong
  if (error) {
    console.log('❌ Showing error screen:', error);
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-800 text-white p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold mb-4 text-red-400">Something went wrong</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  // Render the appropriate view with error boundary
  console.log('🎯 Rendering view:', currentView);
  
  const renderView = () => {
    try {
      switch (currentView) {
        case 'landing':
          return <LandingPage onNavigate={handleLandingNavigation} />;

        case 'auth':
          return <AuthPage onNavigate={handleAuthNavigation} />;

        case 'dashboard':
          return (
            <Dashboard
              onLogout={handleLogout}
              onNavigateToSubscription={navigateToSubscription}
              onNavigateToAffiliate={navigateToAffiliate}
              onNavigateToAdmin={isAdmin ? navigateToAdmin : undefined}
              user={user}
            />
          );

        case 'subscription':
          return (
            <SubscriptionPage 
              onNavigate={(action: string) => {
                if (action === 'dashboard') setCurrentView('dashboard');
                if (action === 'logout') handleLogout();
              }} 
            />
          );

        case 'affiliate':
          return <AffiliatePage />;

        case 'admin':
          if (!isAdmin) {
            console.log('🚫 Non-admin trying to access admin, redirecting to dashboard');
            setCurrentView('dashboard');
            return null;
          }
          return (
            <AdminDashboard 
              onNavigate={(action: string) => {
                if (action === 'dashboard') setCurrentView('dashboard');
                if (action === 'logout') handleLogout();
              }} 
            />
          );

        default:
          console.log('❓ Unknown view, showing landing');
          return <LandingPage onNavigate={handleLandingNavigation} />;
      }
    } catch (renderError) {
      console.error('❌ Error rendering view:', renderError);
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-800 text-white p-4">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold mb-4 text-red-400">Render Error</h1>
            <p className="text-gray-300 mb-6">Failed to render the current view</p>
            <button
              onClick={() => setCurrentView('landing')}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <MobileErrorBoundary 
      fallback={
        <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
          <div className="text-center">
            <h2 className="text-lg font-bold mb-2">Loading Error</h2>
            <p className="text-gray-300 mb-4">Failed to load view</p>
            <button
              onClick={() => setCurrentView('landing')}
              className="bg-emerald-500 px-4 py-2 rounded"
            >
              Go to Home
            </button>
          </div>
        </div>
      }
    >
      {renderView()}
    </MobileErrorBoundary>
  );
};

export default MobileAppContent;