import React, { Suspense } from 'react';
import { MobileSignalsView } from './mobile/MobileSignalsView';
import { MobileChartsView } from './mobile/MobileChartsView';
import { MobileNotificationsView } from './mobile/MobileNotificationsView';
import { MobileSettingsView } from './mobile/MobileSettingsView';
import LazyLoadFallback from './LazyLoadFallback';

interface MobileContentRouterProps {
  activeTab: 'signals' | 'charts' | 'notifications' | 'settings';
}

export const MobileContentRouter: React.FC<MobileContentRouterProps> = ({ activeTab }) => {
  const renderContent = () => {
    switch (activeTab) {
      case 'signals':
        return <MobileSignalsView />;
      case 'charts':
        return <MobileChartsView />;
      case 'notifications':
        return <MobileNotificationsView />;
      case 'settings':
        return <MobileSettingsView />;
      default:
        return <MobileSignalsView />;
    }
  };

  return (
    <div className="h-full">
      <Suspense fallback={<LazyLoadFallback />}>
        {renderContent()}
      </Suspense>
    </div>
  );
};