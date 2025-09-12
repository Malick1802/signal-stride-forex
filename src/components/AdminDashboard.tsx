
import React, { useState } from 'react';
import { TrendingUp, Users, Activity, DollarSign, Shield, Database, BarChart3, Settings } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuth } from '@/contexts/AuthContext';
import UserManagement from './admin/UserManagement';
import SignalManagement from './admin/SignalManagement';
import SignalGenerationSettings from './admin/SignalGenerationSettings';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdminAccess();

  console.log('AdminDashboard: Rendering for user:', user?.email, 'isAdmin:', isAdmin, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-6">You don't have permission to access the admin dashboard.</p>
          <button
            onClick={() => onNavigate('landing')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Top Navigation */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold text-white">Admin Dashboard</span>
            </div>
            <div className="flex items-center space-x-1 bg-red-500/20 px-3 py-1 rounded-full">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">Admin Access</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-white font-medium">{user?.email}</div>
              <div className="text-emerald-400 text-xs">Administrator</div>
            </div>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'signals', label: 'Signal Management', icon: Activity },
              { id: 'financial', label: 'Financial', icon: DollarSign },
              { id: 'system', label: 'System', icon: Database },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'signals' && <SignalManagement />}
        {activeTab === 'financial' && <div className="text-white">Financial Management - Coming Soon</div>}
        {activeTab === 'system' && <div className="text-white">System Administration - Coming Soon</div>}
        {activeTab === 'settings' && <SignalGenerationSettings />}
      </div>
    </div>
  );
};

const AdminOverview = () => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">Loading...</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Signals</p>
              <p className="text-2xl font-bold text-white">Loading...</p>
            </div>
            <Activity className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Revenue</p>
              <p className="text-2xl font-bold text-white">Loading...</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Health</p>
              <p className="text-2xl font-bold text-emerald-400">Good</p>
            </div>
            <Database className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-all">
            <Users className="h-6 w-6 mb-2" />
            <div className="font-medium">Manage Users</div>
          </button>
          <button className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 hover:bg-emerald-500/30 transition-all">
            <Activity className="h-6 w-6 mb-2" />
            <div className="font-medium">Monitor Signals</div>
          </button>
          <button className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-all">
            <BarChart3 className="h-6 w-6 mb-2" />
            <div className="font-medium">View Analytics</div>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
        <div className="space-y-3">
          {[
            { service: 'Signal Generation', status: 'operational', color: 'emerald' },
            { service: 'Market Data Feed', status: 'operational', color: 'emerald' },
            { service: 'Payment Processing', status: 'operational', color: 'emerald' },
            { service: 'API Services', status: 'operational', color: 'emerald' }
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white font-medium">{item.service}</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 bg-${item.color}-400 rounded-full animate-pulse`}></div>
                <span className={`text-${item.color}-400 text-sm capitalize`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
