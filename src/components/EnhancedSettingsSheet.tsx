import React, { useState } from 'react';
import { Settings, User, Bell, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PushNotificationSettings } from './PushNotificationSettings';
import { SMSSettings } from './SMSSettings';

interface EnhancedSettingsSheetProps {
  children: React.ReactNode;
}

export const EnhancedSettingsSheet: React.FC<EnhancedSettingsSheetProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'push', label: 'Push Notifications', icon: Bell },
    { id: 'sms', label: 'SMS Settings', icon: MessageSquare }
  ];

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Prevent event bubbling and sheet closing
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const preventClose = (e: Event) => {
    e.preventDefault();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] bg-slate-900/95 backdrop-blur-sm border-emerald-500/20 focus-visible:outline-none"
        onInteractOutside={preventClose}
        onEscapeKeyDown={preventClose}
        onPointerDownOutside={preventClose}
      >
        <div className="h-full flex flex-col" onClick={stopPropagation}>
          <SheetHeader className="text-left flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white flex items-center space-x-2">
                <Settings className="h-5 w-5 text-emerald-400" />
                <span>Settings</span>
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-400 hover:text-white focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 flex-1 flex flex-col min-h-0" onClick={stopPropagation}>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700 flex-shrink-0">
                {settingsTabs.map(tab => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className="text-xs text-gray-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/20 focus-visible:outline-none"
                    onClick={stopPropagation}
                  >
                    <tab.icon className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-4 flex-1 overflow-y-auto min-h-0" onClick={stopPropagation}>
                <TabsContent value="profile" className="mt-0 h-full" onClick={stopPropagation}>
                  <div className="space-y-4" onClick={stopPropagation}>
                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700" onClick={stopPropagation}>
                      <h3 className="text-white font-medium mb-2">Account Information</h3>
                      <p className="text-gray-400 text-sm">
                        Manage your profile information and account settings.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 focus-visible:outline-none"
                        onClick={(e) => {
                          stopPropagation(e);
                          handleClose();
                        }}
                      >
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="push" className="mt-0 h-full" onClick={stopPropagation}>
                  <div onClick={stopPropagation}>
                    <PushNotificationSettings />
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="mt-0 h-full" onClick={stopPropagation}>
                  <div onClick={stopPropagation}>
                    <SMSSettings />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};