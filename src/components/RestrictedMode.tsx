import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { useProjectRestriction } from "@/contexts/ProjectRestrictionContext";

export const RestrictedMode = () => {
  const { restrictionReason, restrictedUntil, clearRestriction, canRetryAuth } = useProjectRestriction();

  const handleTryAgain = () => {
    clearRestriction();
    window.location.reload();
  };

  const timeRemaining = restrictedUntil 
    ? Math.max(0, Math.ceil((restrictedUntil - Date.now()) / 60000))
    : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <CardTitle className="text-2xl">Service Temporarily Restricted</CardTitle>
          </div>
          <CardDescription>
            This project has been temporarily restricted by Supabase due to quota limitations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Current Status</AlertTitle>
            <AlertDescription>
              {restrictionReason || 'Project services are restricted due to quota violations'}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold">What happened?</h3>
            <p className="text-sm text-muted-foreground">
              The project exceeded Supabase's realtime message quota. The service has been automatically 
              restricted to prevent further overages until the issue is resolved.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">What to do:</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Contact Supabase support to request lifting the restriction</li>
              <li>Confirm that database storage is below quota</li>
              <li>Ensure unnecessary cron jobs have been disabled</li>
              <li>Wait for support confirmation before retrying</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => window.open('https://supabase.help', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Contact Supabase Support
            </Button>
            
            {canRetryAuth && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleTryAgain}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again Now
              </Button>
            )}
          </div>

          {!canRetryAuth && timeRemaining > 0 && (
            <p className="text-sm text-center text-muted-foreground">
              You can try again in {timeRemaining} minutes
            </p>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              This restriction is automatic and will be lifted once the underlying issues are resolved 
              and confirmed by Supabase support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
