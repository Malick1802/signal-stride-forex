import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MobilePushTestButton: React.FC = () => {
  const { user } = useAuth();
  const { isRegistered, pushToken } = usePushNotifications();
  const [testing, setTesting] = useState(false);

  const testPushNotification = async () => {
    if (!user || !isRegistered || !pushToken) {
      toast.error('Push notifications not set up properly');
      return;
    }

    setTesting(true);

    try {
      console.log('🧪 Testing push notification...', {
        userId: user.id,
        hasToken: !!pushToken,
        tokenLength: pushToken?.length
      });

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: '🧪 Push Test',
          body: 'This is a test notification from your mobile app!',
          data: { 
            test: true, 
            timestamp: Date.now(),
            type: 'test'
          },
          notificationType: 'signal',
          userIds: [user.id]
        }
      });

      if (error) {
        console.error('❌ Push test failed:', error);
        toast.error(`Push test failed: ${error.message}`);
      } else {
        console.log('✅ Push test sent:', data);
        toast.success('Push notification test sent! Check your device.');
      }
    } catch (error) {
      console.error('❌ Push test error:', error);
      toast.error(`Test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  if (!isRegistered) {
    return (
      <Button variant="outline" disabled>
        Push Notifications Not Set Up
      </Button>
    );
  }

  return (
    <Button 
      onClick={testPushNotification}
      disabled={testing}
      variant="default"
      className="bg-green-600 hover:bg-green-700"
    >
      {testing ? 'Testing...' : '🧪 Test Push Notification'}
    </Button>
  );
};

export default MobilePushTestButton;