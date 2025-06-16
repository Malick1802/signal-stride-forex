
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Users, TrendingUp, DollarSign, Settings, BarChart3, MessageSquare, Activity, ArrowLeft } from 'lucide-react';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminSignalManagement } from './AdminSignalManagement';
import { AdminAffiliateManagement } from './AdminAffiliateManagement';
import { AdminFinancialManagement } from './AdminFinancialManagement';
import { AdminSystemManagement } from './AdminSystemManagement';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminCommunication } from './AdminCommunication';
import { AdminOverview } from './AdminOverview';

interface AdminDashboardProps {
  onNavigate?: (view: string) => void;
}

export const AdminDashboard = ({ onNavigate }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  const handleBackToDashboard = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Navigation Header */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDashboard}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="text-gray-400">|</div>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-red-400" />
              <span className="text-xl font-bold text-white">Admin Dashboard</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Administrator Dashboard</h1>
            <p className="text-gray-400">Manage all aspects of the trading platform</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-black/20 border-white/10 grid grid-cols-8">
              <TabsTrigger value="overview" className="data-[state=active]:bg-red-500">
                <Activity className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-red-500">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="signals" className="data-[state=active]:bg-red-500">
                <TrendingUp className="h-4 w-4 mr-2" />
                Signals
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="data-[state=active]:bg-red-500">
                <Users className="h-4 w-4 mr-2" />
                Affiliates
              </TabsTrigger>
              <TabsTrigger value="financial" className="data-[state=active]:bg-red-500">
                <DollarSign className="h-4 w-4 mr-2" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-red-500">
                <Settings className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-red-500">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="communication" className="data-[state=active]:bg-red-500">
                <MessageSquare className="h-4 w-4 mr-2" />
                Communication
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <AdminOverview />
            </TabsContent>

            <TabsContent value="users">
              <AdminUserManagement />
            </TabsContent>

            <TabsContent value="signals">
              <AdminSignalManagement />
            </TabsContent>

            <TabsContent value="affiliates">
              <AdminAffiliateManagement />
            </TabsContent>

            <TabsContent value="financial">
              <AdminFinancialManagement />
            </TabsContent>

            <TabsContent value="system">
              <AdminSystemManagement />
            </TabsContent>

            <TabsContent value="analytics">
              <AdminAnalytics />
            </TabsContent>

            <TabsContent value="communication">
              <AdminCommunication />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
