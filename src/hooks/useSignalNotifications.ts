
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

export const useSignalNotifications = () => {
  const { user, session } = useAuth();
  const { isRegistered: pushEnabled, sendTestNotification } = usePushNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const channelRef = useRef<any>(null);

  const setupSignalListener = useCallback(async () => {
    if (!user) return;

    try {
      console.log('📡 Setting up signal notification listener...');
      
      // Clean up existing channel
      if (channelRef.current) {
        console.log('🧹 Cleaning up existing signal listener channel...');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsListening(false);
      }

      // Brief delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsListening(true);

      const channel = supabase
        .channel('signal-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals',
          filter: 'is_centralized=eq.true'
        }, async (payload) => {
          const signal = payload.new;
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
              await supabase.functions.invoke('send-push-notification', {
                body: {
                  title: notificationData.title,
                  body: notificationData.body,
                  data: notificationData.data,
                  notificationType: 'signal'
                }
              });
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
      console.log('✅ Signal notification listener established successfully');
      
    } catch (error) {
      console.error('❌ Error setting up signal listener:', error);
      setIsListening(false);
      
      // Auto-retry after 10 seconds if setup fails
      setTimeout(() => {
        if (!channelRef.current && user) {
          console.log('🔄 Retrying signal listener setup...');
          setupSignalListener();
        }
      }, 10000);
    }
  }, [user, pushEnabled]);

  useEffect(() => {
    setupSignalListener();
    
    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up signal listener on unmount');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsListening(false);
      }
    };
  }, [setupSignalListener]);

  // Add effect to handle reconnection when user changes
  useEffect(() => {
    if (user && !isListening) {
      console.log('👤 User changed - setting up signal listener');
      setupSignalListener();
    }
  }, [user, isListening, setupSignalListener]);

  return {
    notifications,
    isListening,
    sendTestNotification
  };
};
