import React from 'react';
import { TrendingUp, Settings, BarChart3, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';

interface MobileNavigationBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileNavigationBar: React.FC<MobileNavigationBarProps> = ({
  activeTab,
  onTabChange
}) => {
  const { triggerHaptic } = useNativeFeatures();

  const handleTabPress = (tab: string) => {
    triggerHaptic('Light');
    onTabChange(tab);
  };

  const tabs = [
    { id: 'signals', icon: TrendingUp, label: 'Signals' },
    { id: 'expired', icon: BarChart3, label: 'Expired' },
    { id: 'diagnostics', icon: Settings, label: 'Tools' },
    { id: 'testing', icon: Bell, label: 'Test' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
      <div className="flex items-center justify-around py-2 px-4 safe-area-pb">
        {tabs.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              activeTab === id 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
            onClick={() => handleTabPress(id)}
          >
            <Icon className={`h-5 w-5 ${activeTab === id ? 'text-primary' : ''}`} />
            <span className="text-xs font-medium">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};