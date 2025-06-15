
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
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) setError(error.message);
    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: any) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();
    if (error) {
      setError(error.message);
    } else {
      setProfile(data);
    }
    setLoading(false);
    return { data, error };
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: "Not logged in" };
    setUploading(true);
    setError(null);
    const filePath = `${user.id}/${file.name}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (error) {
      setError(error.message);
      setUploading(false);
      return { error };
    }
    // Get public URL
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    // Update profile with new avatar_url
    const result = await updateProfile({ avatar_url: data.publicUrl });
    setUploading(false);
    return result;
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
