
import React, { useState } from 'react';
import { TrendingUp, Users, Activity, DollarSign, Shield, Database, BarChart3, Settings } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuth } from '@/contexts/AuthContext';
import UserManagement from './admin/UserManagement';
import SignalManagement from './admin/SignalManagement';
import SignalGenerationSettings from './admin/SignalGenerationSettings';
import AdminSoundTester from './admin/AdminSoundTester';
import { AdminOverview } from './admin/AdminOverview';

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
        {activeTab === 'system' && <AdminSoundTester />}
        {activeTab === 'settings' && <SignalGenerationSettings />}
      </div>
    </div>
  );
};


export default AdminDashboard;
