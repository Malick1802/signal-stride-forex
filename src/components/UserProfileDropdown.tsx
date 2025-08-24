import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Settings, 
  LogOut, 
  Camera,
  Bell,
  CreditCard,
  Shield,
  Lock,
  Key
} from 'lucide-react';
import UserProfile from './UserProfile';
import { SettingsDialog } from './SettingsDialog';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface UserProfileDropdownProps {
  onLogout?: () => void;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
  onNavigateToAdmin?: () => void;
  className?: string;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  onLogout,
  onUpgrade,
  onManageSubscription,
  onNavigateToAdmin,
  className = ''
}) => {
  const { user, subscription } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdminAccess();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const handleProfileClick = () => {
    setProfileDialogOpen(true);
  };

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return 'Free';
    if (subscription.is_trial_active) return 'Trial';
    if (subscription.subscribed) return 'Pro';
    return 'Free';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={`flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg transition-colors ${className}`}
          >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              <AvatarImage src={profile?.avatar_url} alt="User avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <div className="text-white font-medium text-sm truncate max-w-[120px]">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-emerald-400 text-xs truncate flex items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1.5"></span>
                {getSubscriptionStatus()}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64 bg-slate-900 border-slate-700" align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.avatar_url} alt="User avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-white">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1.5"></span>
                    <span className="text-xs text-emerald-400 font-medium">
                      {getSubscriptionStatus()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-slate-700" />

          <DropdownMenuItem 
            onClick={handleProfileClick}
            className="text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleProfileClick}
            className="text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <Camera className="mr-2 h-4 w-4" />
            <span>Change Avatar</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleProfileClick}
            className="text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <Lock className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>

          <SettingsDialog>
            <DropdownMenuItem className="text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer">
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
            </DropdownMenuItem>
          </SettingsDialog>

          <SettingsDialog>
            <DropdownMenuItem className="text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
          </SettingsDialog>

          <DropdownMenuSeparator className="bg-slate-700" />

          {!subscription?.subscribed && (
            <DropdownMenuItem 
              onClick={onUpgrade}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Upgrade to Pro</span>
            </DropdownMenuItem>
          )}

          {subscription?.subscribed && (
            <DropdownMenuItem 
              onClick={onManageSubscription}
              className="text-slate-200 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Manage Subscription</span>
            </DropdownMenuItem>
          )}

          {isAdmin && (
            <DropdownMenuItem 
              onClick={onNavigateToAdmin}
              className="text-red-400 hover:text-red-300 hover:bg-slate-800 cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin Panel</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="bg-slate-700" />

          <DropdownMenuItem 
            onClick={onLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Dialog */}
      <UserProfile 
        open={profileDialogOpen} 
        onOpenChange={setProfileDialogOpen} 
      />

    </>
  );
};