import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  FileText, 
  Settings,
  Smartphone
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

const FCMSetupGuide: React.FC = () => {
  const [step, setStep] = useState(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const requiredPackageName = "app.lovable.da46b9852e6844b390bc922d481bf104";

  if (!Capacitor.isNativePlatform()) {
    return (
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertTitle>Mobile Platform Required</AlertTitle>
        <AlertDescription>
          FCM setup is only required for mobile app deployment. This guide will be available when running on a mobile device.
        </AlertDescription>
      </Alert>
    );
  }

  const steps = [
    {
      title: "Create Firebase Project",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set up a new Firebase project to enable push notifications.
          </p>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
              className="w-full justify-start"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Firebase Console
            </Button>
            <ol className="text-sm space-y-2 ml-4 list-decimal">
              <li>Click "Create a project" or "Add project"</li>
              <li>Enter your project name (e.g., "ForexAlert Pro")</li>
              <li>Enable Google Analytics (recommended)</li>
              <li>Wait for project creation to complete</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: "Add Android App",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Register your Android app with Firebase.
          </p>
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <label className="text-sm font-medium">Package Name (Required):</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-muted px-2 py-1 rounded text-xs flex-1">{requiredPackageName}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(requiredPackageName, 'Package name')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <ol className="text-sm space-y-2 ml-4 list-decimal">
              <li>In Firebase Console, click "Add app" → Android icon</li>
              <li>Paste the package name above (must match exactly)</li>
              <li>Add app nickname: "ForexAlert Pro Android"</li>
              <li>Skip SHA-1 for now (can add later for release)</li>
              <li>Click "Register app"</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      title: "Download google-services.json",
      content: (
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Step</AlertTitle>
            <AlertDescription>
              The google-services.json file is required for push notifications to work. Without it, the app cannot register for FCM tokens.
            </AlertDescription>
          </Alert>
          <div className="space-y-3">
            <ol className="text-sm space-y-2 ml-4 list-decimal">
              <li>Click "Download google-services.json" in Firebase Console</li>
              <li>Save the file to your computer</li>
              <li>Replace the placeholder file in your project</li>
              <li>The file must be placed at: <code className="bg-muted px-1 rounded">android/app/google-services.json</code></li>
            </ol>
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Current Status</AlertTitle>
              <AlertDescription>
                Your current google-services.json contains placeholder values. Push notifications will not work until you replace it with a real file from Firebase.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    },
    {
      title: "Configure Supabase FCM Secret",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add your Firebase service account to Supabase for server-side push notifications.
          </p>
          <div className="space-y-3">
            <ol className="text-sm space-y-2 ml-4 list-decimal">
              <li>In Firebase Console, go to Project Settings → Service Accounts</li>
              <li>Click "Generate new private key"</li>
              <li>Download the JSON file</li>
              <li>Copy the entire JSON content</li>
              <li>Add it to Supabase as the FCM_SERVICE_ACCOUNT secret</li>
            </ol>
            <Button 
              variant="outline" 
              onClick={() => window.open('https://supabase.com/dashboard/project/ugtaodrvbpfeyhdgmisn/settings/functions', '_blank')}
              className="w-full justify-start"
            >
              <Settings className="w-4 h-4 mr-2" />
              Open Supabase Secrets
            </Button>
          </div>
        </div>
      )
    },
    {
      title: "Test & Deploy",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Build and test your app with real push notifications.
          </p>
          <div className="space-y-3">
            <ol className="text-sm space-y-2 ml-4 list-decimal">
              <li>Run <code className="bg-muted px-1 rounded">npx cap sync</code> to sync changes</li>
              <li>Build and install the app on a physical device</li>
              <li>Test notifications using the Push Notification Tester</li>
              <li>Verify background delivery by backgrounding the app</li>
            </ol>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Testing on Physical Devices</AlertTitle>
              <AlertDescription>
                Push notifications only work on physical devices, not emulators. Background delivery requires proper battery optimization settings.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          FCM Setup Guide
        </CardTitle>
        <CardDescription>
          Configure Firebase Cloud Messaging for push notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-between items-center">
          {steps.map((_, index) => (
            <div key={index} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  index < step 
                    ? 'bg-primary text-primary-foreground' 
                    : index === step - 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-px w-12 mx-2 ${index < step - 1 ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Current step content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{steps[step - 1].title}</h3>
            <Badge variant="outline">Step {step} of {steps.length}</Badge>
          </div>
          
          {steps[step - 1].content}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Previous
          </Button>
          <Button 
            onClick={() => setStep(Math.min(steps.length, step + 1))}
            disabled={step === steps.length}
          >
            {step === steps.length ? 'Complete' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FCMSetupGuide;