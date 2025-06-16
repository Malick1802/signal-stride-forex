
import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Users, 
  LogOut, 
  Settings, 
  CreditCard,
  DollarSign,
  Activity,
  Shield,
  Phone
} from 'lucide-react';
import TradingSignals from './TradingSignals';
import UserProfile from './UserProfile';
import SubscriptionPage from './SubscriptionPage';
import { SMSSettings } from './SMSSettings';
import { SystemHealthIndicator } from './SystemHealthIndicator';
import SubscriptionStatusWidget from './SubscriptionStatusWidget';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateToAffiliate?: () => void;
  onNavigateToAdmin?: () => void;
}

const Dashboard = ({ user, onLogout, onNavigateToAffiliate, onNavigateToAdmin }: DashboardProps) => {
  const { signOut, subscription } = useAuth();
  const { isAdmin } = useAdminCheck();
  const [activeTab, setActiveTab] = useState('signals');

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  const handleUpgrade = () => {
    setActiveTab('subscription');
  };

  const handleManageSubscription = () => {
    setActiveTab('subscription');
  };

  const handleNavigate = (view: string) => {
    if (view === 'dashboard') {
      setActiveTab('signals');
    } else {
      setActiveTab(view);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">FX Signal Pro</h1>
              <SystemHealthIndicator />
            </div>
            
            <div className="flex items-center space-x-4">
              <SubscriptionStatusWidget 
                subscription={subscription}
                onUpgrade={handleUpgrade}
                onManageSubscription={handleManageSubscription}
              />
              
              {onNavigateToAffiliate && (
                <Button
                  variant="ghost"
                  onClick={onNavigateToAffiliate}
                  className="text-gray-300 hover:text-white"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Affiliate Program
                </Button>
              )}

              {isAdmin && onNavigateToAdmin && (
                <Button
                  variant="ghost"
                  onClick={onNavigateToAdmin}
                  className="text-red-300 hover:text-red-200 border border-red-500/20"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-300 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.email}!
          </h2>
          <p className="text-gray-300">
            Monitor your trading signals and manage your account
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black/20 border-white/10">
            <TabsTrigger value="signals" className="data-[state=active]:bg-emerald-500">
              <Activity className="h-4 w-4 mr-2" />
              Trading Signals
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-500">
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-emerald-500">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="sms" className="data-[state=active]:bg-emerald-500">
              <Phone className="h-4 w-4 mr-2" />
              SMS Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="space-y-6">
            <TradingSignals />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <UserProfile />
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <SubscriptionPage onNavigate={handleNavigate} />
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <SMSSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
