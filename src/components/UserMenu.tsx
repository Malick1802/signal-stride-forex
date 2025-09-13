import React, { useState } from 'react';
import { User, Settings, LogOut, CreditCard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserProfile from './UserProfile';
import { SettingsDialog } from './SettingsDialog';

interface UserMenuProps {
  profile: any;
  user: any;
  onLogout: () => void;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
  loggingOut?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  profile,
  user,
  onLogout,
  onUpgrade,
  onManageSubscription,
  loggingOut = false
}) => {
  const [showProfile, setShowProfile] = useState(false);

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
              <AvatarImage src={profile?.avatar_url} alt="Avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm font-bold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="text-right hidden sm:block">
              <div className="text-foreground font-medium truncate max-w-[120px]">
                {profile?.full_name || user?.email}
              </div>
              <div className="text-muted-foreground text-xs truncate">
                {user?.email}
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            <User className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          
          <SettingsDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </SettingsDialog>
          
          {(onUpgrade || onManageSubscription) && (
            <>
              <DropdownMenuSeparator />
              {onUpgrade && (
                <DropdownMenuItem onClick={onUpgrade}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </DropdownMenuItem>
              )}
              {onManageSubscription && (
                <DropdownMenuItem onClick={onManageSubscription}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription
                </DropdownMenuItem>
              )}
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={onLogout}
            disabled={loggingOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className={`mr-2 h-4 w-4 ${loggingOut ? 'animate-spin' : ''}`} />
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserProfile open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
};