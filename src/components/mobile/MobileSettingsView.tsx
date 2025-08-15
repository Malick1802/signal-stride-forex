import React, { useState } from 'react';
import { Settings, User, Bell, MessageSquare, Shield, CreditCard, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PushNotificationSettings } from '../PushNotificationSettings';
import { SMSSettings } from '../SMSSettings';
import UserProfile from '../UserProfile';
import { useAuth } from '@/contexts/AuthContext';

type SettingsSection = 'main' | 'profile' | 'push' | 'sms';

export const MobileSettingsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      // Logout will be handled by parent component
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const settingsItems = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your account information',
      icon: User,
      action: () => setShowProfileModal(true)
    },
    {
      id: 'push',
      title: 'Push Notifications',
      description: 'Configure mobile notifications',
      icon: Bell,
      action: () => setActiveSection('push')
    },
    {
      id: 'sms',
      title: 'SMS Settings',
      description: 'Setup SMS notifications',
      icon: MessageSquare,
      action: () => setActiveSection('sms')
    }
  ];

  const renderMainSettings = () => (
    <div className="space-y-4">
      {/* User Info Card */}
      <Card className="p-4 bg-slate-800/50 border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-white">{user?.email || 'User'}</h3>
            <p className="text-sm text-gray-400">Free Trial Account</p>
          </div>
        </div>
      </Card>

      {/* Settings Options */}
      <div className="space-y-2">
        {settingsItems.map((item) => (
          <Card
            key={item.id}
            className="p-4 bg-slate-800/30 border-slate-700 cursor-pointer hover:bg-slate-800/50 transition-colors"
            onClick={item.action}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-medium text-white">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Card>
        ))}
      </div>

      <Separator className="bg-slate-700" />

      {/* Account Actions */}
      <div className="space-y-2">
        <Card className="p-4 bg-slate-800/30 border-slate-700">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <div className="flex-1">
              <h4 className="font-medium text-white">Subscription</h4>
              <p className="text-sm text-gray-400">Manage your subscription</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-800/30 border-slate-700">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-orange-400" />
            <div className="flex-1">
              <h4 className="font-medium text-white">Privacy & Security</h4>
              <p className="text-sm text-gray-400">Data protection settings</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </Card>
      </div>

      <Separator className="bg-slate-700" />

      {/* Logout */}
      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      <div className="text-center pt-4">
        <p className="text-xs text-gray-500">
          ForexAlert Pro v1.0
        </p>
      </div>
    </div>
  );

  const renderBackButton = (title: string) => (
    <Button
      variant="ghost"
      onClick={() => setActiveSection('main')}
      className="mb-4 text-emerald-400 hover:text-emerald-300"
    >
      ← Back to {title}
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {/* Header */}
      <div className="pt-4 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-6 w-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">
            {activeSection === 'main' ? 'Settings' : 
             activeSection === 'push' ? 'Push Notifications' :
             activeSection === 'sms' ? 'SMS Settings' : 'Profile'}
          </h1>
        </div>
      </div>

      {/* Content */}
      {activeSection === 'main' && renderMainSettings()}
      
      {activeSection === 'push' && (
        <div>
          {renderBackButton('Settings')}
          <PushNotificationSettings />
        </div>
      )}
      
      {activeSection === 'sms' && (
        <div>
          {renderBackButton('Settings')}
          <SMSSettings />
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <UserProfile open={showProfileModal} onOpenChange={setShowProfileModal} />
      )}
    </div>
  );
};