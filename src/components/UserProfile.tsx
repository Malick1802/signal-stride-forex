import React, { useRef, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { SMSSettings } from "./SMSSettings";
import { PushNotificationSettings } from "./PushNotificationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserProfile({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { profile, loading, updateProfile, uploadAvatar, uploading } = useProfile();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({
    full_name: "",
    first_name: "",
    last_name: ""
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
      });
    }
  }, [profile]);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev: any) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    const { error } = await updateProfile(form);
    if (!error) {
      toast({ title: "Profile updated", description: "Your profile has been updated successfully." });
      setEditing(false);
    } else {
      toast({ title: "Error updating profile", description: error.message || "An error occurred", variant: "destructive" });
    }
  };

  const triggerFile = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    await uploadAvatar(e.target.files[0]);
    toast({ title: "Avatar updated", description: "Your profile image has been updated." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-8 text-muted">Loading...</div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="push-notifications">Push Notifications</TabsTrigger>
              <TabsTrigger value="sms-notifications">SMS Notifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt="Avatar" />
                      ) : (
                        <AvatarFallback>
                          {profile?.full_name
                            ? profile.full_name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                            : "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Button
                      type="button"
                      size="sm"
                      className="absolute bottom-0 right-0 bg-white text-slate-900 shadow border"
                      disabled={uploading}
                      onClick={triggerFile}
                      aria-label="Upload Avatar"
                    >
                      <span className="sr-only">Upload Avatar</span>
                      <svg viewBox="0 0 20 20" width={16} height={16} fill="none"><path d="M4 16a2 2 0 01-2-2V6a2 2 0 012-2h2V2h8v2h2a2 2 0 012 2v8a2 2 0 01-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 9v8m0 0-3-3m3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                  </div>
                  <div className="font-semibold text-lg">{profile?.full_name}</div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-foreground">Email</label>
                  <Input value={profile?.email || ""} readOnly className="bg-gray-100" />
                </div>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">First Name</label>
                    <Input
                      name="first_name"
                      value={form.first_name}
                      onChange={handleFieldChange}
                      disabled={!editing}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Last Name</label>
                    <Input
                      name="last_name"
                      value={form.last_name}
                      onChange={handleFieldChange}
                      disabled={!editing}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Full Name</label>
                  <Input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleFieldChange}
                    disabled={!editing}
                    autoComplete="off"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  {editing ? (
                    <>
                      <Button type="submit" variant="default">Save</Button>
                      <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="push-notifications">
              <PushNotificationSettings />
            </TabsContent>
            
            <TabsContent value="sms-notifications">
              <SMSSettings />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
