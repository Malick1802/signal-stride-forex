import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useSignalNotifications } from '@/hooks/useSignalNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MobilePushNotificationReviverProps {
  onStatusUpdate?: (status: string) => void;
}

export const MobilePushNotificationReviver: React.FC<MobilePushNotificationReviverProps> = ({ 
  onStatusUpdate 
}) => {
  const { user } = useAuth();
  const { isRegistered, pushToken, initializePushNotifications } = usePushNotifications();
  const { isListening } = useSignalNotifications();
  const [revivalAttempts, setRevivalAttempts] = useState(0);
  const [lastRevivalTime, setLastRevivalTime] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    const checkAndRevivePushNotifications = async () => {
      const now = Date.now();
      
      // Prevent too frequent revival attempts (max once per 30 seconds)
      if (now - lastRevivalTime < 30000) return;
      
      try {
        console.log('🔍 Checking push notification health...');
        onStatusUpdate?.('Checking push notification status...');

        // Check 1: Push token registration
        if (!isRegistered || !pushToken) {
          console.warn('⚠️ Push notifications not registered, attempting revival...');
          onStatusUpdate?.('Push notifications not registered - reviving...');
          
          const success = await initializePushNotifications();
          if (success) {
            console.log('✅ Push notifications revived successfully');
            onStatusUpdate?.('Push notifications revived successfully');
            toast.success('Push notifications restored');
          } else {
            console.error('❌ Failed to revive push notifications');
            onStatusUpdate?.('Failed to revive push notifications');
          }
          
          setRevivalAttempts(prev => prev + 1);
          setLastRevivalTime(now);
          return;
        }

        // Check 2: Signal listener status
        if (!isListening) {
          console.warn('⚠️ Signal listener not active, restarting...');
          onStatusUpdate?.('Signal listener inactive - restarting...');
          
          // Force restart the signal listener by clearing and re-initializing
          // This will be handled by the useSignalNotifications hook automatically
          toast.info('Restarting signal listener...');
          return;
        }

        // Check 3: Database token validity
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('push_token, push_enabled, device_type')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ Failed to check database token:', error);
          onStatusUpdate?.('Database check failed');
          return;
        }

        if (!profile?.push_token || profile.push_token !== pushToken) {
          console.warn('⚠️ Database token mismatch, updating...');
          onStatusUpdate?.('Updating database token...');
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              push_token: pushToken,
              push_enabled: true,
              device_type: Capacitor.getPlatform(),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('❌ Failed to update database token:', updateError);
            onStatusUpdate?.('Failed to update database token');
          } else {
            console.log('✅ Database token updated successfully');
            onStatusUpdate?.('Database token updated');
          }
          return;
        }

        // Check 4: FCM connectivity test
        console.log('🧪 Testing FCM connectivity...');
        onStatusUpdate?.('Testing FCM connectivity...');
        
        const { error: testError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            title: 'Connectivity Test',
            body: 'Push notifications are working properly',
            data: { test: true, timestamp: Date.now() },
            notificationType: 'signal',
            userIds: [user.id]
          }
        });

        if (testError) {
          console.error('❌ FCM connectivity test failed:', testError);
          onStatusUpdate?.('FCM connectivity test failed');
          
          // Attempt to re-register push notifications
          setRevivalAttempts(prev => prev + 1);
          if (revivalAttempts < 3) {
            console.log('🔄 Attempting push notification re-registration...');
            await initializePushNotifications();
          }
        } else {
          console.log('✅ FCM connectivity test passed');
          onStatusUpdate?.('Push notifications working properly');
        }

        setLastRevivalTime(now);

      } catch (error) {
        console.error('❌ Push notification health check failed:', error);
        onStatusUpdate?.(`Health check failed: ${error}`);
      }
    };

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(checkAndRevivePushNotifications, 5000);

    // Periodic health checks every 2 minutes
    const healthCheckInterval = setInterval(checkAndRevivePushNotifications, 120000);

    // App state change listener
    let appStateListener: any = null;
    const setupAppStateListener = async () => {
      try {
        const { App } = await import('@capacitor/app');
        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('📱 App became active - checking push notifications...');
            setTimeout(checkAndRevivePushNotifications, 2000);
          }
        });
      } catch (error) {
        console.warn('⚠️ Could not set up app state listener:', error);
      }
    };

    setupAppStateListener();

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(healthCheckInterval);
      if (appStateListener && appStateListener.remove) {
        appStateListener.remove();
      }
    };
  }, [user, isRegistered, pushToken, isListening, initializePushNotifications, revivalAttempts, lastRevivalTime, onStatusUpdate]);

  // This component doesn't render anything
  return null;
};

export default MobilePushNotificationReviver;