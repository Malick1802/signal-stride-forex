
import React, { useState } from 'react';
import { Settings, Smartphone, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SettingsDialog } from './SettingsDialog';

interface MobileActionMenuProps {
  onOpenProfile: () => void;
}

export const MobileActionMenu: React.FC<MobileActionMenuProps> = ({ onOpenProfile }) => {
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  return (
    <div className="flex items-center space-x-2 md:hidden">
      {/* Settings Button */}
      <SettingsDialog>
        <Button variant="ghost" size="sm" className="text-gray-400">
          <Settings className="h-5 w-5" />
        </Button>
      </SettingsDialog>

      {/* Quick Menu */}
      <Sheet open={quickMenuOpen} onOpenChange={setQuickMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-400">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[50vh] bg-slate-900/95 backdrop-blur-sm border-emerald-500/20">
          <SheetHeader className="text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-emerald-400" />
                <span>Quick Actions</span>
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuickMenuOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            <Button
              onClick={() => {
                setQuickMenuOpen(false);
                onOpenProfile();
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
              <p className="text-gray-400 text-sm">
                Access all settings including push notifications and SMS preferences through the Settings button in the top bar.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
