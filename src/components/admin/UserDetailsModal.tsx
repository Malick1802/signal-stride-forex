import React from 'react';
import { X, User, Mail, Phone, Calendar, CreditCard, Shield, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/utils/formatting';

interface UserDetailsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onRoleToggle: (userId: string, isCurrentlyAdmin: boolean) => void;
  isUpdatingRole: boolean;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onRoleToggle,
  isUpdatingRole
}) => {
  if (!user) return null;

  const userRole = user.user_roles?.some((role: any) => role.role === 'admin') ? 'admin' : 'user';
  const isAdmin = userRole === 'admin';
  
  const subscription = user.subscribers?.[0];
  const subscriptionStatus = subscription?.subscribed ? 'Active' : 
                           subscription?.trial_end && new Date(subscription.trial_end) > new Date() ? 'Trial' : 
                           'Inactive';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.full_name || 'Unknown User'}</h2>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Full Name</p>
                  <p className="text-white">{user.full_name || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Phone Number</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-white">{user.phone_number || 'Not provided'}</p>
                    {user.sms_verified && (
                      <Badge variant="outline" className="text-xs">Verified</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Joined</p>
                  <p className="text-white">{formatDate(user.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Role</p>
                  <Badge variant={isAdmin ? "destructive" : "secondary"}>
                    {userRole}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Subscription</p>
                  <div className="space-y-1">
                    <Badge variant={subscriptionStatus === 'Active' ? "default" : "outline"}>
                      {subscriptionStatus}
                    </Badge>
                    {subscription && (
                      <div className="text-sm text-gray-400">
                        {subscription.subscription_tier && (
                          <p>Tier: {subscription.subscription_tier}</p>
                        )}
                        {subscription.trial_end && (
                          <p>Trial ends: {formatDate(subscription.trial_end)}</p>
                        )}
                        {subscription.subscription_end && (
                          <p>Ends: {formatDate(subscription.subscription_end)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Push Notifications</p>
                  <div className="space-y-1">
                    <Badge variant={user.push_new_signals ? "default" : "outline"}>
                      New Signals: {user.push_new_signals ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <br />
                    <Badge variant={user.push_targets_hit ? "default" : "outline"}>
                      Target Hits: {user.push_targets_hit ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <div className="space-x-2">
              <Button
                onClick={() => onRoleToggle(user.id, isAdmin)}
                disabled={isUpdatingRole}
                variant={isAdmin ? "destructive" : "default"}
                size="sm"
              >
                {isUpdatingRole ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {isAdmin ? 'Remove Admin' : 'Make Admin'}
                  </>
                )}
              </Button>
            </div>
            
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};