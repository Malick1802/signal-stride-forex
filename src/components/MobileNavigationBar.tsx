import React from 'react';
import { TrendingUp, Settings, BarChart3, Bell, LogOut, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface MobileNavigationBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
  onSettings?: () => void;
}

export const MobileNavigationBar: React.FC<MobileNavigationBarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  onUpgrade,
  onManageSubscription,
  onSettings
}) => {
  const { triggerHaptic } = useNativeFeatures();
  const { isAdmin } = useAdminAccess();

  const handleTabPress = (tab: { id: string; action?: () => void }) => {
    triggerHaptic('Light');
    if (tab.action) {
      tab.action();
    } else {
      onTabChange(tab.id);
    }
  };

  const tabs = [
    { id: 'signals', icon: TrendingUp, label: 'Signals' },
    { id: 'expired', icon: BarChart3, label: 'Expired' },
    { id: 'settings', icon: Settings, label: 'Settings', action: onSettings },
    ...(onUpgrade ? [{ id: 'upgrade', icon: CreditCard, label: 'Upgrade', action: onUpgrade }] : []),
    ...(onManageSubscription ? [{ id: 'subscription', icon: CreditCard, label: 'Billing', action: onManageSubscription }] : []),
    ...(isAdmin ? [{ id: 'diagnostics', icon: Settings, label: 'Tools' }] : []),
    ...(isAdmin ? [{ id: 'testing', icon: Bell, label: 'Test' }] : []),
    { id: 'logout', icon: LogOut, label: 'Sign Out', action: onLogout }
  ];

  const logoutTab = tabs.find(tab => tab.id === 'logout');
  const visibleTabs = tabs.filter(tab => tab.id !== 'logout');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
      <div className="flex items-center gap-2 py-3 px-4 safe-area-pb">
        <div className="flex items-center gap-2 overflow-x-auto flex-1">
          {visibleTabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 h-auto py-3 px-4 shrink-0 ${
                activeTab === tab.id 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => handleTabPress(tab)}
            >
              <tab.icon className={`h-16 w-16 ${activeTab === tab.id ? 'text-primary' : ''}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          ))}
        </div>
        {logoutTab && (
          <Button
            key={logoutTab.id}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-auto py-3 px-4 shrink-0 text-red-400`}
            onClick={() => handleTabPress(logoutTab)}
          >
            <logoutTab.icon className={`h-16 w-16 text-red-400`} />
            <span className="text-xs font-medium">{logoutTab.label}</span>
          </Button>
        )}
      </div>
    </div>
  );
};