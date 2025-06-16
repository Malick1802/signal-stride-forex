
import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SMSSettings = () => {
  const { profile, updateProfile, loading } = useProfile();
  const { sendVerificationCode, verifyPhoneNumber, isLoading, isSending, cooldownTime } = usePhoneVerification();
  const { toast } = useToast();
  
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [smsEnabled, setSmsEnabled] = useState(profile?.sms_notifications_enabled || false);
  const [newSignals, setNewSignals] = useState(profile?.sms_new_signals || true);
  const [targetsHit, setTargetsHit] = useState(profile?.sms_targets_hit || true);
  const [stopLoss, setStopLoss] = useState(profile?.sms_stop_loss || true);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setPhoneNumber(profile.phone_number || '');
      setSmsEnabled(profile.sms_notifications_enabled || false);
      setNewSignals(profile.sms_new_signals || true);
      setTargetsHit(profile.sms_targets_hit || true);
      setStopLoss(profile.sms_stop_loss || true);
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      const { error } = await updateProfile({
        phone_number: phoneNumber,
        sms_notifications_enabled: smsEnabled,
        sms_new_signals: newSignals,
        sms_targets_hit: targetsHit,
        sms_stop_loss: stopLoss,
        sms_verified: phoneNumber !== profile?.phone_number ? false : profile?.sms_verified // Reset verification if phone number changed
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update SMS settings',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'SMS Settings Updated',
          description: 'Your SMS notification preferences have been saved'
        });
        // If phone number changed, show verification section
        if (phoneNumber !== profile?.phone_number) {
          setShowVerification(true);
        }
      }
    } catch (error) {
      console.error('Error updating SMS settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update SMS settings',
        variant: 'destructive'
      });
    }
  };

  const handleSendVerification = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number first',
        variant: 'destructive'
      });
      return;
    }

    const result = await sendVerificationCode(phoneNumber);
    if (result.success) {
      toast({
        title: 'Verification Code Sent',
        description: 'Please check your phone for the verification code'
      });
      setShowVerification(true);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to send verification code',
        variant: 'destructive'
      });
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        variant: 'destructive'
      });
      return;
    }

    const result = await verifyPhoneNumber(phoneNumber, verificationCode);
    if (result.success) {
      toast({
        title: 'Phone Verified',
        description: 'Your phone number has been successfully verified!'
      });
      setShowVerification(false);
      setVerificationCode('');
      // Refresh profile to update verification status
      window.location.reload();
    } else {
      toast({
        title: 'Verification Failed',
        description: result.error || 'Invalid verification code',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Enter your phone number in international format (e.g., +1234567890)
          </p>
        </div>

        {profile?.phone_number && !profile?.sms_verified && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md space-y-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Phone number not verified. SMS notifications are disabled until verified.
            </p>
            
            {!showVerification ? (
              <Button 
                onClick={handleSendVerification}
                disabled={isSending || cooldownTime > 0}
                size="sm"
                variant="outline"
              >
                {isSending ? 'Sending...' : cooldownTime > 0 ? `Wait ${cooldownTime}s` : 'Send Verification Code'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="text-sm">
                  Verification Code
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleVerifyCode}
                    disabled={isLoading || !verificationCode}
                    size="sm"
                  >
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSendVerification}
                    disabled={isSending || cooldownTime > 0}
                    size="sm"
                    variant="ghost"
                  >
                    {cooldownTime > 0 ? `Resend in ${cooldownTime}s` : 'Resend Code'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {profile?.sms_verified && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✅ Phone number verified
            </p>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="sms-enabled"
            checked={smsEnabled}
            onCheckedChange={(checked) => setSmsEnabled(checked as boolean)}
          />
          <Label htmlFor="sms-enabled" className="text-sm font-medium">
            Enable SMS notifications
          </Label>
        </div>

        {smsEnabled && (
          <div className="ml-6 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-signals"
                checked={newSignals}
                onCheckedChange={(checked) => setNewSignals(checked as boolean)}
              />
              <Label htmlFor="new-signals" className="text-sm">
                New trading signals
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="targets-hit"
                checked={targetsHit}
                onCheckedChange={(checked) => setTargetsHit(checked as boolean)}
              />
              <Label htmlFor="targets-hit" className="text-sm">
                Target profits hit
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="stop-loss"
                checked={stopLoss}
                onCheckedChange={(checked) => setStopLoss(checked as boolean)}
              />
              <Label htmlFor="stop-loss" className="text-sm">
                Stop loss alerts
              </Label>
            </div>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save SMS Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
