import React, { useState, useRef } from 'react';
import { User, Camera, Upload } from 'lucide-react';
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
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

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
  const { uploadAvatar, uploading, fetchProfile } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('UserMenu: Starting avatar upload for file:', file.name);
      const result = await uploadAvatar(file);
      
      if (result?.error) {
        console.error('UserMenu: Upload error:', result.error);
        toast({
          title: "Upload failed",
          description: typeof result.error === 'string' ? result.error : result.error.message || 'Upload failed',
          variant: "destructive",
        });
      } else {
        console.log('UserMenu: Upload successful, refreshing profile');
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated successfully.",
        });
        // Force a refresh of the profile data
        setTimeout(() => {
          fetchProfile();
          onProfileUpdate?.();
        }, 500);
      }
    } catch (error) {
      console.error('UserMenu: Unexpected upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="relative">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-emerald-500">
                <AvatarImage src={profile?.avatar_url} alt="Avatar" />
                <AvatarFallback className="bg-emerald-500 text-white text-xs sm:text-sm font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </div>
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
            onClick={triggerFileUpload}
            disabled={uploading}
            className="text-white hover:bg-gray-800 cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Change Photo'}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowProfile(true)}
            className="text-white hover:bg-gray-800 cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      <UserProfile open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
};