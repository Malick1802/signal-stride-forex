
import React, { lazy, Suspense } from 'react';
import MobileLoadingScreen from './MobileLoadingScreen';

const Dashboard = lazy(() => import('./Dashboard'));

interface LazyDashboardProps {
  user: any;
  onLogout: () => void;
  onNavigateToAffiliate?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToSubscription?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const LazyDashboard: React.FC<LazyDashboardProps> = (props) => {
  return (
    <Suspense fallback={<MobileLoadingScreen message="Loading Dashboard..." />}>
      <Dashboard {...props} />
    </Suspense>
  );
};

export default LazyDashboard;
