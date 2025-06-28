
import React, { lazy } from 'react';
import LazyLoadingWrapper from './LazyLoadingWrapper';

const Dashboard = lazy(() => import('./Dashboard'));

interface LazyDashboardProps {
  user: any;
  onLogout: () => void;
  onNavigateToAffiliate?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToSubscription?: () => void;
}

const LazyDashboard: React.FC<LazyDashboardProps> = (props) => {
  return (
    <LazyLoadingWrapper height="min-h-screen">
      <Dashboard {...props} />
    </LazyLoadingWrapper>
  );
};

export default LazyDashboard;
