import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ConfirmationState = 'loading' | 'success' | 'error' | 'already_confirmed';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ConfirmationState>('loading');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const redirect_to = searchParams.get('redirect_to');

        console.log('Auth callback params:', { token_hash, type, redirect_to });

        if (!token_hash || !type) {
          setState('error');
          setError('Invalid confirmation link. Please try signing up again.');
          return;
        }

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        console.log('Verification result:', { data, error });

        if (error) {
          if (error.message.toLowerCase().includes('expired')) {
            setState('error');
            setError('This confirmation link has expired. Please request a new one.');
          } else if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('confirmed')) {
            setState('already_confirmed');
          } else {
            setState('error');
            setError(error.message);
          }
          return;
        }

        if (data.user) {
          setState('success');
          toast({
            title: "Email Confirmed!",
            description: "Your account has been successfully verified.",
          });
          
          // Redirect after a short delay
          setTimeout(() => {
            navigate(redirect_to || '/');
          }, 2000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setState('error');
        setError('An unexpected error occurred. Please try again.');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, toast]);

  const handleResendConfirmation = async () => {
    const email = searchParams.get('email');
    if (!email) {
      toast({
        title: "Error",
        description: "Unable to resend confirmation. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email Sent",
          description: "A new confirmation email has been sent to your address.",
        });
      }
    } catch (err) {
      console.error('Resend error:', err);
      toast({
        title: "Error",
        description: "Failed to resend confirmation email.",
        variant: "destructive",
      });
    }
  };

  const getStateContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Confirming your email...</h2>
            <p className="text-muted-foreground">Please wait while we verify your account.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Email Confirmed!</h2>
            <p className="text-muted-foreground mb-4">
              Your account has been successfully verified. You'll be redirected shortly.
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          </div>
        );

      case 'already_confirmed':
        return (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-blue-500" />
            <h2 className="text-xl font-semibold mb-2">Already Confirmed</h2>
            <p className="text-muted-foreground mb-4">
              Your email has already been confirmed. You can now sign in to your account.
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Confirmation Failed</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={handleResendConfirmation} variant="outline" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Resend Confirmation Email
              </Button>
              <Button onClick={() => navigate('/')} variant="default" className="w-full">
                Go Back Home
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          {getStateContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;