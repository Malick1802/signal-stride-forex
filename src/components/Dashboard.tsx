
import React, { useState } from 'react';
import { TrendingUp, RefreshCw, Bell, Settings, LogOut } from 'lucide-react';
import TradingSignals from './TradingSignals';
import ExpiredSignals from './ExpiredSignals';
import UserProfile from './UserProfile';
import { useProfile } from '@/hooks/useProfile';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('signals');
  const [refreshing, setRefreshing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { profile } = useProfile();

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleLogout = async () => {
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Top Navigation */}
      <nav className="bg-black/20 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold text-white">ForexSignal Pro</span>
            </div>
            <div className="flex items-center space-x-1 bg-emerald-500/20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-sm font-medium">Live</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Profile"
              onClick={() => setProfileOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="mr-2">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                      {profile?.full_name
                        ? profile.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                        : 'U'}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-white font-medium truncate max-w-[120px]">{profile?.full_name || user.email}</div>
                  <div className="text-emerald-400 text-xs truncate">{user.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* UserProfile Modal */}
      <UserProfile open={profileOpen} onOpenChange={setProfileOpen} />

      {/* Tab Navigation */}
      <div className="bg-black/10 backdrop-blur-sm border-b border-white/10">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'signals', label: 'Active Signals' },
              { id: 'expired', label: 'Expired Signals' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'signals' && <TradingSignals />}
        {activeTab === 'expired' && <ExpiredSignals />}
      </div>
    </div>
  );
};

export default Dashboard;
