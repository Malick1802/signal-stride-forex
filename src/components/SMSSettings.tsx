
import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SMSSettings = () => {
  const { profile, updateProfile, loading } = useProfile();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [smsEnabled, setSmsEnabled] = useState(profile?.sms_notifications_enabled || false);
  const [newSignals, setNewSignals] = useState(profile?.sms_new_signals || true);
  const [targetsHit, setTargetsHit] = useState(profile?.sms_targets_hit || true);
  const [stopLoss, setStopLoss] = useState(profile?.sms_stop_loss || true);

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
        sms_verified: false // Reset verification when phone number changes
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

        {profile?.phone_number && !profile?.sms_verified && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ Phone number not verified. SMS notifications are disabled until verified.
            </p>
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
