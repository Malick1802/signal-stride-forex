
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

// Singleton guards for realtime channel per user session
let activeUserId: string | null = null;
let activeChannelRef: any = null;

export const useSignalNotifications = () => {
  const { user, session } = useAuth();
  const { isRegistered: pushEnabled, sendTestNotification } = usePushNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const channelRef = useRef<any>(null);

  const setupSignalListener = useCallback(async () => {
    if (!user) return;
    if (activeUserId === user.id && activeChannelRef) {
      console.log('🔁 Signal listener already active for user, reusing channel.');
      channelRef.current = activeChannelRef;
      setIsListening(true);
      return;
    }

    if (isListening) return;

    try {
      console.log('📡 Setting up signal notification listener...');
      setIsListening(true);

      // Clean up existing channels
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (activeChannelRef) {
        supabase.removeChannel(activeChannelRef);
      }

      const channel = supabase
        .channel(`signal-notifications-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        }, async (payload) => {
          const signal = payload.new as any;
          console.log('🚨 New signal received:', signal);
          
          const notificationData = {
            id: `signal-${signal.id}`,
            title: `🚨 New ${signal.type} Signal`,
            body: `${signal.symbol} - Entry: ${signal.price}`,
            data: { signal, timestamp: Date.now() }
          };

          // Show notification
          try {
            if (pushEnabled) {
              try {
                const { data: fnData, error: fnError } = await supabase.functions.invoke('send-push-notification', {
                  body: {
                    title: notificationData.title,
                    body: notificationData.body,
                    data: notificationData.data,
                    notificationType: 'new_signal'
                  }
                });
                console.log('send-push-notification result:', { fnData, fnError });
              } catch (err) {
                console.warn('send-push-notification invoke threw:', err);
              }
            }
          } catch (error) {
            console.warn('Push notification failed:', error);
          }

          // Always show toast as fallback
          toast(notificationData.title, {
            description: notificationData.body,
            duration: 5000,
          });

          setNotifications(prev => [notificationData, ...prev.slice(0, 49)]);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        }, async (payload) => {
          const signal = payload.new;
          const oldSignal = payload.old;
          
          // Check for target hits
          const oldTargets = oldSignal.targets_hit || [];
          const newTargets = signal.targets_hit || [];
          
          if (newTargets.length > oldTargets.length) {
            const latestTarget = Math.max(...newTargets);
            
            const notificationData = {
              id: `target-${signal.id}-${latestTarget}`,
              title: `🎯 Target ${latestTarget} Hit!`,
              body: `${signal.symbol} reached TP${latestTarget}`,
              data: { signal, targetLevel: latestTarget, timestamp: Date.now() }
            };

            toast(notificationData.title, {
              description: notificationData.body,
              duration: 5000,
            });

            setNotifications(prev => [notificationData, ...prev.slice(0, 49)]);
          }
        })
        .subscribe();

      channelRef.current = channel;
      activeChannelRef = channel;
      activeUserId = user.id;
      
    } catch (error) {
      console.error('Error setting up signal listener:', error);
      setIsListening(false);
    }
  }, [user, isListening, pushEnabled]);

  useEffect(() => {
    setupSignalListener();
    
    return () => {
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
      }
      if (activeChannelRef) {
        try { supabase.removeChannel(activeChannelRef); } catch {}
      }
      channelRef.current = null;
      activeChannelRef = null;
      activeUserId = null;
      setIsListening(false);
    };
  }, [setupSignalListener]);

  return {
    notifications,
    isListening,
    sendTestNotification
  };
};
