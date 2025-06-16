
import React, { useState } from 'react';
import { Users, Shield, CreditCard, Search, UserPlus, MoreHorizontal } from 'lucide-react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { users, usersLoading, userStats, updateUserRole } = useUserManagement();

  const filteredUsers = users?.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleRoleToggle = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      await updateUserRole.mutateAsync({
        userId,
        role: isCurrentlyAdmin ? 'user' : 'admin'
      });
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const getUserRole = (userRoles: any) => {
    if (!userRoles || !Array.isArray(userRoles)) return 'user';
    return userRoles.some(role => role.role === 'admin') ? 'admin' : 'user';
  };

  const getSubscriptionStatus = (subscribers: any) => {
    if (!subscribers || !Array.isArray(subscribers)) return 'No subscription';
    const sub = subscribers[0];
    if (!sub) return 'No subscription';
    if (sub.subscribed) return `Active (${sub.subscription_tier || 'Unknown'})`;
    if (sub.trial_end && new Date(sub.trial_end) > new Date()) return 'Trial';
    return 'Expired';
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{userStats?.totalUsers || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Subscribers</p>
              <p className="text-2xl font-bold text-white">{userStats?.activeSubscribers || 0}</p>
            </div>
            <CreditCard className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Trial Users</p>
              <p className="text-2xl font-bold text-white">{userStats?.trialUsers || 0}</p>
            </div>
            <UserPlus className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Admin Users</p>
              <p className="text-2xl font-bold text-white">{userStats?.adminUsers || 0}</p>
            </div>
            <Shield className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">User Management</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-gray-300">User</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Subscription</TableHead>
                <TableHead className="text-gray-300">Phone</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const userRole = getUserRole(user.user_roles);
                const isAdmin = userRole === 'admin';
                const subscriptionStatus = getSubscriptionStatus(user.subscribers);
                
                return (
                  <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.full_name || 'Unknown'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={isAdmin ? "destructive" : "secondary"}>
                        {userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscriptionStatus.includes('Active') ? "default" : "outline"}>
                        {subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {user.phone_number ? (
                        <div className="flex items-center space-x-1">
                          <span>{user.phone_number}</span>
                          {user.sms_verified && (
                            <Badge variant="outline" className="text-xs">Verified</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Not provided</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleRoleToggle(user.id, isAdmin)}
                        disabled={updateUserRole.isPending}
                        className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        title={isAdmin ? 'Remove admin role' : 'Grant admin role'}
                      >
                        {updateUserRole.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            {searchTerm ? 'No users found matching your search.' : 'No users found.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
