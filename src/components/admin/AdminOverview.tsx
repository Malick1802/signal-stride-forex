import React from 'react';
import { TrendingUp, Users, Activity, DollarSign, Database, Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { SystemHealthIndicator } from '@/components/SystemHealthIndicator';
import { formatCurrency, formatTimeAgo } from '@/utils/formatting';

export const AdminOverview = () => {
  const { stats, statsLoading, recentActivity, activityLoading, functionMetrics } = useAdminOverview();

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 animate-pulse">
              <div className="h-12 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return <Users className="h-4 w-4 text-blue-400" />;
      case 'signal_created': return <Activity className="h-4 w-4 text-emerald-400" />;
      case 'subscription': return <DollarSign className="h-4 w-4 text-green-400" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSystemHealthStatus = () => {
    if (!stats?.systemHealth) return 'Unknown';
    const healthChecks = Object.values(stats.systemHealth);
    const healthyCount = healthChecks.filter(Boolean).length;
    const healthPercentage = (healthyCount / healthChecks.length) * 100;
    
    if (healthPercentage === 100) return 'Excellent';
    if (healthPercentage >= 75) return 'Good';
    if (healthPercentage >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-blue-400">
                {stats?.activeSubscribers || 0} subscribers • {stats?.trialUsers || 0} trials
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Signals</p>
              <p className="text-2xl font-bold text-white">{stats?.activeSignals || 0}</p>
              <p className="text-xs text-emerald-400">
                {stats?.todaysSignals || 0} today • {stats?.successRate || 0}% success
              </p>
            </div>
            <Activity className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats?.totalRevenue || 0)}</p>
              <p className="text-xs text-green-400">
                {formatCurrency(stats?.monthlyRevenue || 0)} this month
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Health</p>
              <p className="text-2xl font-bold text-emerald-400">{getSystemHealthStatus()}</p>
              <div className="mt-1">
                <SystemHealthIndicator />
              </div>
            </div>
            <Database className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* System Performance & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Activity
          </h3>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3">
                  <div className="h-8 w-8 bg-white/10 rounded-full"></div>
                  <div className="flex-1 h-4 bg-white/10 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivity?.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{activity.description}</p>
                    <p className="text-gray-400 text-xs">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
              {(!recentActivity || recentActivity.length === 0) && (
                <p className="text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          )}
        </div>

        {/* System Status Details */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2" />
            System Status
          </h3>
          <div className="space-y-3">
            {stats?.systemHealth && Object.entries(stats.systemHealth).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white font-medium capitalize">
                  {service.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center space-x-2">
                  {status ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 text-sm">Operational</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">Issues</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Function Performance */}
      {functionMetrics && functionMetrics.length > 0 && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Function Performance (24h)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(
              functionMetrics.reduce((acc, metric) => {
                if (!acc[metric.function_name]) {
                  acc[metric.function_name] = { total: 0, successful: 0, avgTime: 0 };
                }
                acc[metric.function_name].total += 1;
                if (metric.success) acc[metric.function_name].successful += 1;
                acc[metric.function_name].avgTime += metric.execution_time_ms || 0;
                return acc;
              }, {} as any)
            ).map(([funcName, metrics]: [string, any]) => {
              const successRate = Math.round((metrics.successful / metrics.total) * 100);
              const avgTime = Math.round(metrics.avgTime / metrics.total);
              
              return (
                <div key={funcName} className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-white font-medium text-sm mb-2">{funcName}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Success Rate:</span>
                      <span className={successRate >= 95 ? 'text-emerald-400' : successRate >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                        {successRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Time:</span>
                      <span className="text-blue-400">{avgTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Calls:</span>
                      <span className="text-white">{metrics.total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-500/30 transition-all">
            <Users className="h-6 w-6 mb-2 mx-auto" />
            <div className="font-medium text-sm">Manage Users</div>
          </button>
          <button className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 hover:bg-emerald-500/30 transition-all">
            <Activity className="h-6 w-6 mb-2 mx-auto" />
            <div className="font-medium text-sm">Monitor Signals</div>
          </button>
          <button className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-500/30 transition-all">
            <DollarSign className="h-6 w-6 mb-2 mx-auto" />
            <div className="font-medium text-sm">Financial Reports</div>
          </button>
          <button className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-all">
            <Database className="h-6 w-6 mb-2 mx-auto" />
            <div className="font-medium text-sm">System Health</div>
          </button>
        </div>
      </div>
    </div>
  );
};