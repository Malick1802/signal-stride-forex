import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FCMSetupGuide: React.FC = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          FCM Server Key Configuration Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Push notifications require FCM_SERVER_KEY to be configured in Supabase Edge Function secrets.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Step 1: Get Firebase Server Key</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <Button 
                variant="link" 
                className="p-0 h-auto text-primary"
                onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              >
                Firebase Console <ExternalLink className="h-3 w-3 ml-1" />
              </Button></li>
              <li>Select your project or create a new one</li>
              <li>Navigate to Project Settings → Cloud Messaging</li>
              <li>Under "Cloud Messaging API (Legacy)", copy the Server Key</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Step 2: Configure Supabase Secret</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <Button 
                variant="link" 
                className="p-0 h-auto text-primary"
                onClick={() => window.open('https://supabase.com/dashboard/project/ugtaodrvbpfeyhdgmisn/settings/functions', '_blank')}
              >
                Supabase Edge Functions Secrets <ExternalLink className="h-3 w-3 ml-1" />
              </Button></li>
              <li>Click "Add new secret"</li>
              <li>Set Name: <code className="bg-muted px-1 rounded">FCM_SERVER_KEY</code></li>
              <li>Paste your Firebase Server Key as the Value</li>
              <li>Click "Add secret"</li>
            </ol>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Step 3: Verify Configuration</h3>
            <p className="text-sm text-muted-foreground">
              After adding the secret, try the FCM test functions in the debugger to verify everything works.
            </p>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-medium mb-2">Quick Reference Commands</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <code className="text-sm">FCM_SERVER_KEY</code>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard('FCM_SERVER_KEY')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Once configured, the push notification system should work automatically. 
            Use the debugging tools below to test the full flow.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default FCMSetupGuide;