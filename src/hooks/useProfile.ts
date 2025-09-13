
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      console.log('useProfile: No user, clearing profile');
      setProfile(null);
      setLoading(false);
      return;
    }
    
    console.log('useProfile: Fetching profile for user:', user.id);
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error('useProfile: Error fetching profile:', error);
        setError(error.message);
      } else {
        console.log('useProfile: Profile fetched successfully:', data);
        setProfile(data);
      }
    } catch (err) {
      console.error('useProfile: Unexpected error:', err);
      setError('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: any) => {
    if (!user) {
      console.error('useProfile: No user for profile update');
      return { error: 'Not logged in' };
    }
    
    console.log('useProfile: Updating profile with:', updates);
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select()
        .single();
      
      if (error) {
        console.error('useProfile: Error updating profile:', error);
        setError(error.message);
        return { error };
      } else {
        console.log('useProfile: Profile updated successfully:', data);
        setProfile(data);
        return { data };
      }
    } catch (err) {
      console.error('useProfile: Unexpected error during update:', err);
      const errorMessage = 'Failed to update profile';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      console.error('useProfile: No user for avatar upload');
      return { error: "Not logged in" };
    }
    
    console.log('useProfile: Starting avatar upload for file:', file.name);
    setUploading(true);
    setError(null);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      console.log('useProfile: Uploading to storage path:', fileName);
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) {
        console.error('useProfile: Storage upload error:', uploadError);
        setError(uploadError.message);
        setUploading(false);
        return { error: uploadError };
      }
      
      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const avatarUrl = data.publicUrl;
      
      console.log('useProfile: Got public URL:', avatarUrl);
      
      // Update profile with new avatar_url
      const result = await updateProfile({ avatar_url: avatarUrl });
      setUploading(false);
      
      if (result.error) {
        console.error('useProfile: Error updating profile with avatar URL:', result.error);
        return result;
      }
      
      console.log('useProfile: Avatar upload and profile update complete');
      return result;
    } catch (err) {
      console.error('useProfile: Unexpected error during avatar upload:', err);
      const errorMessage = 'Failed to upload avatar';
      setError(errorMessage);
      setUploading(false);
      return { error: errorMessage };
    }
  };

  return {
    profile,
    loading,
    error,
    uploading,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  };
}
