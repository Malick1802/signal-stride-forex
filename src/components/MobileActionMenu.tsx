
import React, { useState } from 'react';
import { Bell, Settings, Smartphone, Vibrate, Volume2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface MobileActionMenuProps {
  onOpenProfile: () => void;
}

export const MobileActionMenu: React.FC<MobileActionMenuProps> = ({ onOpenProfile }) => {
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const { profile, updateProfile } = useProfile();
  const { isRegistered, initializePushNotifications } = usePushNotifications();
  const { toast } = useToast();

  const handleQuickToggle = async (setting: string, value: boolean) => {
    const { error } = await updateProfile({ [setting]: value });
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Setting updated',
        description: `${setting.replace(/_/g, ' ')} ${value ? 'enabled' : 'disabled'}`,
      });
    }
  };

  const handleEnableNotifications = async () => {
    await initializePushNotifications();
    setQuickSettingsOpen(false);
  };

  return (
    <div className="flex items-center space-x-2 md:hidden">
      {/* Quick Notifications Toggle */}
      <Sheet open={quickSettingsOpen} onOpenChange={setQuickSettingsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5 text-gray-400" />
            {!isRegistered && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] bg-slate-900/95 backdrop-blur-sm border-emerald-500/20">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-emerald-400" />
              <span>Quick Settings</span>
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Notification Status */}
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium">Push Notifications</h3>
                {isRegistered ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Bell className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <Bell className="w-3 h-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </div>
              
              {!isRegistered && (
                <Button 
                  onClick={handleEnableNotifications}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  size="sm"
                >
                  Enable Notifications
                </Button>
              )}
            </div>

            {/* Quick Toggles */}
            {isRegistered && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-gray-400" />
                    <span className="text-white text-sm">New Signals</span>
                  </div>
                  <Switch
                    checked={profile?.push_new_signals ?? true}
                    onCheckedChange={(value) => handleQuickToggle('push_new_signals', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-white text-sm">Stop Loss Alerts</span>
                  </div>
                  <Switch
                    checked={profile?.push_stop_loss ?? true}
                    onCheckedChange={(value) => handleQuickToggle('push_stop_loss', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-white text-sm">Sound</span>
                  </div>
                  <Switch
                    checked={profile?.push_sound_enabled ?? true}
                    onCheckedChange={(value) => handleQuickToggle('push_sound_enabled', value)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                  <div className="flex items-center space-x-3">
                    <Vibrate className="w-4 h-4 text-gray-400" />
                    <span className="text-white text-sm">Vibration</span>
                  </div>
                  <Switch
                    checked={profile?.push_vibration_enabled ?? true}
                    onCheckedChange={(value) => handleQuickToggle('push_vibration_enabled', value)}
                  />
                </div>
              </div>
            )}

            {/* Full Settings Button */}
            <Button 
              onClick={() => {
                setQuickSettingsOpen(false);
                onOpenProfile();
              }}
              variant="outline"
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Full Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
