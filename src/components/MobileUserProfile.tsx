import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Settings, 
  LogOut, 
  Camera,
  Bell,
  CreditCard,
  Shield,
  ChevronRight
} from 'lucide-react';
import UserProfile from './UserProfile';
import { SettingsDialog } from './SettingsDialog';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Separator } from '@/components/ui/separator';

interface MobileUserProfileProps {
  onLogout?: () => void;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
  onNavigateToAdmin?: () => void;
}

export const MobileUserProfile: React.FC<MobileUserProfileProps> = ({
  onLogout,
  onUpgrade,
  onManageSubscription,
  onNavigateToAdmin
}) => {
  const { user, subscription } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdminAccess();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
    setIsOpen(false);
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

  const handleActionWithClose = (action?: () => void) => {
    setIsOpen(false);
    if (action) action();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} alt="User avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-80 bg-slate-900 border-slate-700">
          <SheetHeader className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url} alt="User avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <SheetTitle className="text-white text-lg">
                  {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                </SheetTitle>
                <p className="text-slate-400 text-sm">{user?.email}</p>
                <div className="flex items-center mt-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                  <span className="text-emerald-400 text-sm font-medium">
                    {getSubscriptionStatus()}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-8 space-y-1">
            {/* Profile Section */}
            <Button
              variant="ghost"
              onClick={handleProfileClick}
              className="w-full justify-start text-white hover:bg-slate-800 h-12"
            >
              <User className="mr-3 h-5 w-5" />
              <span>Edit Profile</span>
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              onClick={handleProfileClick}
              className="w-full justify-start text-white hover:bg-slate-800 h-12"
            >
              <Camera className="mr-3 h-5 w-5" />
              <span>Change Avatar</span>
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>

            <Separator className="my-4 bg-slate-700" />

            {/* Settings */}
            <SettingsDialog>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-slate-800 h-12"
              >
                <Bell className="mr-3 h-5 w-5" />
                <span>Notifications</span>
                <ChevronRight className="ml-auto h-4 w-4" />
              </Button>
            </SettingsDialog>

            <SettingsDialog>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-slate-800 h-12"
              >
                <Settings className="mr-3 h-5 w-5" />
                <span>Settings</span>
                <ChevronRight className="ml-auto h-4 w-4" />
              </Button>
            </SettingsDialog>

            <Separator className="my-4 bg-slate-700" />

            {/* Subscription */}
            {!subscription?.subscribed && (
              <Button
                variant="ghost"
                onClick={() => handleActionWithClose(onUpgrade)}
                className="w-full justify-start text-emerald-400 hover:bg-slate-800 h-12"
              >
                <CreditCard className="mr-3 h-5 w-5" />
                <span>Upgrade to Pro</span>
                <ChevronRight className="ml-auto h-4 w-4" />
              </Button>
            )}

            {subscription?.subscribed && (
              <Button
                variant="ghost"
                onClick={() => handleActionWithClose(onManageSubscription)}
                className="w-full justify-start text-white hover:bg-slate-800 h-12"
              >
                <CreditCard className="mr-3 h-5 w-5" />
                <span>Manage Subscription</span>
                <ChevronRight className="ml-auto h-4 w-4" />
              </Button>
            )}

            {/* Admin */}
            {isAdmin && (
              <>
                <Separator className="my-4 bg-slate-700" />
                <Button
                  variant="ghost"
                  onClick={() => handleActionWithClose(onNavigateToAdmin)}
                  className="w-full justify-start text-red-400 hover:bg-slate-800 h-12"
                >
                  <Shield className="mr-3 h-5 w-5" />
                  <span>Admin Panel</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Button>
              </>
            )}

            <Separator className="my-4 bg-slate-700" />

            {/* Logout */}
            <Button
              variant="ghost"
              onClick={() => handleActionWithClose(onLogout)}
              className="w-full justify-start text-red-400 hover:bg-red-900/20 h-12"
            >
              <LogOut className="mr-3 h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Profile Dialog */}
      <UserProfile 
        open={profileDialogOpen} 
        onOpenChange={setProfileDialogOpen} 
      />
    </>
  );
};