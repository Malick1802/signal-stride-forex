import React, { useState } from 'react';
import { User } from 'lucide-react';
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

interface UserMenuProps {
  profile: any;
  user: any;
  onLogout: () => void;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
  loggingOut?: boolean;
  onProfileUpdate?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  profile,
  user,
  onLogout,
  onUpgrade,
  onManageSubscription,
  loggingOut = false,
  onProfileUpdate
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
          <button className="flex items-center space-x-2 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-emerald-500">
              <AvatarImage src={profile?.avatar_url} alt="Avatar" />
              <AvatarFallback className="bg-emerald-500 text-white text-xs sm:text-sm font-bold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="text-right hidden sm:block">
              <div className="text-white font-medium truncate max-w-[120px]">
                {profile?.full_name || user?.email}
              </div>
              <div className="text-emerald-400 text-xs truncate">
                {user?.email}
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-gray-900 border-gray-700 text-white z-50"
          sideOffset={5}
        >
          <DropdownMenuLabel className="text-white">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-gray-400">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="bg-gray-700" />
          
          <DropdownMenuItem 
            onClick={() => setShowProfile(true)}
            className="text-white hover:bg-gray-800 cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserProfile open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
};