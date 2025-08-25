
import React from 'react';
import Dashboard from './Dashboard';

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
  return <Dashboard {...props} />;
};

export default LazyDashboard;
