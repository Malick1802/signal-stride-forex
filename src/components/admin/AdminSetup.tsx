import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AdminSetup = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const makeUserAdmin = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('make_user_admin', {
        user_email: email.trim()
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Admin access granted to ${email}`,
      });
      setEmail('');
    } catch (error: any) {
      console.error('Error making user admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant admin access",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-blue-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Admin Setup Required</h3>
            <p className="mt-2 text-sm text-blue-700">
              To use the admin dashboard, you need admin permissions. Enter an email address below to grant admin access to that user.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Grant Admin Access
          </CardTitle>
          <CardDescription>
            Enter the email address of the user you want to make an admin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  makeUserAdmin();
                }
              }}
            />
          </div>
          <Button 
            onClick={makeUserAdmin}
            disabled={isLoading || !email.trim()}
            className="w-full"
          >
            {isLoading ? "Granting Access..." : "Grant Admin Access"}
          </Button>
        </CardContent>
      </Card>

      <div className="rounded-md bg-green-50 p-4">
        <div className="flex">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Next Steps</h3>
            <p className="mt-2 text-sm text-green-700">
              After granting admin access, the user will need to refresh their browser or log out and log back in to see the admin dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};