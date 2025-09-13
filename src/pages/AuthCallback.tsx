import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

type ConfirmationState = 'loading' | 'success' | 'error' | 'already_confirmed';

const AuthCallback = () => {
  const [state, setState] = useState<ConfirmationState>('loading');
  const [error, setError] = useState<string>('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const redirect_to = searchParams.get('redirect_to');

        console.log('Auth callback triggered:', { token_hash, type, redirect_to });

        if (!token_hash || !type) {
          setError('Invalid confirmation link. Please try again.');
          setState('error');
          return;
        }

        // Exchange the token for a session
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (verifyError) {
          console.error('Verification error:', verifyError);
          
          // Check if already confirmed
          if (verifyError.message?.includes('already been confirmed') || 
              verifyError.message?.includes('Email link is invalid or has expired')) {
            setState('already_confirmed');
            return;
          }
          
          setError(verifyError.message || 'Failed to confirm email. Please try again.');
          setState('error');
          return;
        }

        if (data.user) {
          console.log('Email confirmed successfully for user:', data.user.email);
          setState('success');
          toast.success('Email confirmed successfully! Welcome to ForexAlert Pro.');
          
          // Redirect after a short delay to show success message
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setError('Confirmation failed. Please try again.');
          setState('error');
        }

      } catch (error: any) {
        console.error('Auth callback error:', error);
        setError(error.message || 'An unexpected error occurred.');
        setState('error');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  // If user is already logged in, redirect to home
  useEffect(() => {
    if (user && state === 'loading') {
      console.log('User already authenticated, redirecting...');
      navigate('/');
    }
  }, [user, navigate, state]);

  const handleResendConfirmation = async () => {
    try {
      const email = searchParams.get('email');
      if (!email) {
        toast.error('Email address not found. Please try signing up again.');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast.error('Failed to resend confirmation email.');
      } else {
        toast.success('Confirmation email sent! Please check your inbox.');
      }
    } catch (error) {
      toast.error('Failed to resend confirmation email.');
    }
  };

  const getStateContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Confirming Your Email</h1>
            <p className="text-muted-foreground">Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold text-green-700">Email Confirmed!</h1>
            <p className="text-muted-foreground">
              Welcome to ForexAlert Pro! Your email has been successfully confirmed.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
          </div>
        );

      case 'already_confirmed':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-blue-500" />
            <h1 className="text-2xl font-bold">Email Already Confirmed</h1>
            <p className="text-muted-foreground">
              Your email has already been confirmed. You can now sign in to your account.
            </p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go to Sign In
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <h1 className="text-2xl font-bold text-red-700">Confirmation Failed</h1>
            <p className="text-muted-foreground">{error}</p>
            <div className="space-y-2">
              <Button 
                onClick={handleResendConfirmation}
                variant="outline"
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Confirmation Email
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="secondary"
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {getStateContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;