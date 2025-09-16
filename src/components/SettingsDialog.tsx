
import React, { useState } from 'react';
import { Settings, User, Bell, MessageSquare, CreditCard, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PushNotificationSettings } from './PushNotificationSettings';
import { SMSSettings } from './SMSSettings';
import UserProfile from './UserProfile';

interface SettingsDialogProps {
  children: React.ReactNode;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'push', label: 'Push Notifications', icon: Bell },
    { id: 'sms', label: 'SMS Settings', icon: MessageSquare }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] bg-slate-900/95 backdrop-blur-sm border-emerald-500/20"
      >
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white flex items-center space-x-2">
              <Settings className="h-5 w-5 text-emerald-400" />
              <span>Settings</span>
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700">
              {settingsTabs.map(tab => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id}
                  className="text-xs text-gray-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/20"
                >
                  <tab.icon className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-4 h-[calc(90vh-160px)] overflow-y-auto">
              <TabsContent value="profile" className="mt-0">
                <div className="space-y-4">
                  {/* Profile settings will be embedded here */}
                  <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                    <h3 className="text-white font-medium mb-2">Account Information</h3>
                    <p className="text-gray-400 text-sm">
                      Manage your profile information and account settings.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setIsOpen(false);
                        // This will be handled by opening the UserProfile modal
                      }}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="push" className="mt-0">
                <PushNotificationSettings />
              </TabsContent>

              <TabsContent value="sms" className="mt-0">
                <SMSSettings />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
