import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface NotificationQueue {
  id: string;
  type: 'signal' | 'target' | 'stop_loss' | 'market_update';
  title: string;
  body: string;
  data: any;
  timestamp: number;
  attempts: number;
  delivered: boolean;
}

interface ConnectionHealth {
  supabaseConnected: boolean;
  realtimeConnected: boolean;
  lastHeartbeat: number;
  authValid: boolean;
}

export const useNotificationReliability = () => {
  const { user, session } = useAuth();
  const [queue, setQueue] = useState<NotificationQueue[]>([]);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    supabaseConnected: false,
    realtimeConnected: false,
    lastHeartbeat: 0,
    authValid: false
  });
  const [backupPollingActive, setBackupPollingActive] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const pollingRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>();

  // Monitor connection health
  const checkConnectionHealth = useCallback(async () => {
    try {
      // Check Supabase connection
      const { data, error } = await supabase.from('trading_signals').select('id').limit(1);
      const supabaseConnected = !error;
      
      // Check auth validity
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const authValid = !!currentSession?.access_token;
      
      setConnectionHealth(prev => ({
        ...prev,
        supabaseConnected,
        authValid,
        lastHeartbeat: Date.now()
      }));

      if (!supabaseConnected || !authValid) {
        console.warn('🔄 Connection issues detected, activating backup polling');
        activateBackupPolling();
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
      setConnectionHealth(prev => ({
        ...prev,
        supabaseConnected: false,
        authValid: false,
        lastHeartbeat: Date.now()
      }));
      activateBackupPolling();
    }
  }, []);

  // Enhanced real-time setup with connection monitoring
  const setupEnhancedRealtime = useCallback(() => {
    if (!user) return;

    console.log('🔔 Setting up enhanced real-time with reliability monitoring...');

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('reliable-notifications', {
        config: {
          presence: { key: user.id },
          broadcast: { self: true }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        console.log('🔄 Presence sync - connection active');
        setConnectionHealth(prev => ({ ...prev, realtimeConnected: true }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('✅ Joined real-time channel:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('⚠️ Left real-time channel:', key);
        setConnectionHealth(prev => ({ ...prev, realtimeConnected: false }));
        activateBackupPolling();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trading_signals',
        filter: 'is_centralized=eq.true'
      }, (payload) => {
        console.log('🚨 Real-time signal received:', payload.new);
        queueNotification({
          type: 'signal',
          title: `🚨 New ${payload.new.type} Signal`,
          body: `${payload.new.symbol} - Entry: ${payload.new.price}`,
          data: { signal: payload.new, source: 'realtime' }
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trading_signals',
        filter: 'is_centralized=eq.true'
      }, (payload) => {
        const signal = payload.new;
        const oldSignal = payload.old;
        
        // Check for target hits
        const oldTargets = oldSignal.targets_hit || [];
        const newTargets = signal.targets_hit || [];
        
        if (newTargets.length > oldTargets.length) {
          const latestTarget = Math.max(...newTargets);
          queueNotification({
            type: 'target',
            title: `🎯 Target ${latestTarget} Hit!`,
            body: `${signal.symbol} reached TP${latestTarget}`,
            data: { signal, targetLevel: latestTarget, source: 'realtime' }
          });
        }
      })
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionHealth(prev => ({ ...prev, realtimeConnected: true }));
          deactivateBackupPolling(); // Turn off polling when real-time works
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionHealth(prev => ({ ...prev, realtimeConnected: false }));
          activateBackupPolling();
        }
      });

    channelRef.current = channel;
  }, [user]);

  // Backup polling system
  const activateBackupPolling = useCallback(() => {
    if (backupPollingActive) return;
    
    console.log('🔄 Activating backup polling system...');
    setBackupPollingActive(true);
    
    const poll = async () => {
      try {
        if (!user) return;
        
        // Poll for new signals in the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        
        const { data: recentSignals, error } = await supabase
          .from('trading_signals')
          .select('*')
          .eq('is_centralized', true)
          .gte('created_at', twoMinutesAgo)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Polling error:', error);
          return;
        }

        recentSignals?.forEach(signal => {
          // Check if we already notified about this signal
          const existing = queue.find(item => 
            item.data?.signal?.id === signal.id && item.type === 'signal'
          );
          
          if (!existing) {
            console.log('📱 Backup polling found new signal:', signal.symbol);
            queueNotification({
              type: 'signal',
              title: `🚨 New ${signal.type} Signal`,
              body: `${signal.symbol} - Entry: ${signal.price}`,
              data: { signal, source: 'polling' }
            });
          }
        });

      } catch (error) {
        console.error('❌ Backup polling failed:', error);
      }
    };

    // Poll every 30 seconds when backup is active
    pollingRef.current = setInterval(poll, 30000);
    poll(); // Initial poll
  }, [backupPollingActive, user, queue]);

  const deactivateBackupPolling = useCallback(() => {
    if (!backupPollingActive) return;
    
    console.log('⏹️ Deactivating backup polling system...');
    setBackupPollingActive(false);
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = undefined;
    }
  }, [backupPollingActive]);

  // Queue notification for delivery
  const queueNotification = useCallback((notification: Omit<NotificationQueue, 'id' | 'timestamp' | 'attempts' | 'delivered'>) => {
    const queueItem: NotificationQueue = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      attempts: 0,
      delivered: false
    };

    setQueue(prev => [...prev, queueItem]);
    processQueue();
  }, []);

  // Process notification queue
  const processQueue = useCallback(async () => {
    const undelivered = queue.filter(item => !item.delivered && item.attempts < 3);
    
    for (const notification of undelivered) {
      try {
        console.log('📱 Processing queued notification:', notification.title);
        
        // Try multiple delivery methods
        const delivered = await attemptNotificationDelivery(notification);
        
        if (delivered) {
          setQueue(prev => prev.map(item => 
            item.id === notification.id 
              ? { ...item, delivered: true }
              : item
          ));
        } else {
          // Increment attempt count
          setQueue(prev => prev.map(item => 
            item.id === notification.id 
              ? { ...item, attempts: item.attempts + 1 }
              : item
          ));
        }
      } catch (error) {
        console.error('❌ Error processing notification:', error);
      }
    }

    // Clean up old delivered notifications
    setQueue(prev => prev.filter(item => 
      !item.delivered || (Date.now() - item.timestamp < 24 * 60 * 60 * 1000)
    ));
  }, [queue]);

  // Attempt notification delivery through multiple channels
  const attemptNotificationDelivery = async (notification: NotificationQueue): Promise<boolean> => {
    let delivered = false;

    // Method 1: Push notification via Supabase function
    try {
      if (session?.access_token) {
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            title: notification.title,
            body: notification.body,
            data: notification.data,
            notificationType: notification.type,
            userIds: user ? [user.id] : undefined
          }
        });

        if (!error) {
          console.log('✅ Push notification sent via Supabase');
          delivered = true;
        }
      }
    } catch (error) {
      console.warn('⚠️ Supabase push notification failed:', error);
    }

    // Method 2: Local notification (mobile only)
    if (!delivered && Capacitor.isNativePlatform()) {
      try {
        const { MobileNotificationManager } = await import('@/utils/mobileNotifications');
        await MobileNotificationManager.showInstantSignalNotification(
          notification.title,
          notification.body,
          notification.data
        );
        console.log('✅ Local notification sent');
        delivered = true;
      } catch (error) {
        console.warn('⚠️ Local notification failed:', error);
      }
    }

    // Method 3: In-app toast as last resort
    if (!delivered) {
      toast(notification.title, {
        description: notification.body,
        duration: 5000,
      });
      console.log('✅ Fallback toast notification sent');
      delivered = true;
    }

    return delivered;
  };

  // Sync missed notifications on app activation
  const syncMissedNotifications = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔄 Syncing missed notifications...');
      
      // Get notifications from the last hour that user might have missed
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentSignals } = await supabase
        .from('trading_signals')
        .select('*')
        .eq('is_centralized', true)
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false });

      if (recentSignals?.length) {
        console.log(`📱 Found ${recentSignals.length} recent signals for sync`);
        
        // Show a summary notification instead of spamming individual ones
        toast(`📊 Missed Notifications`, {
          description: `You have ${recentSignals.length} recent trading signals. Check the dashboard for details.`,
          duration: 8000,
        });
      }

    } catch (error) {
      console.error('❌ Error syncing missed notifications:', error);
    }
  }, [user]);

  // Initialize and cleanup
  useEffect(() => {
    if (user) {
      checkConnectionHealth();
      setupEnhancedRealtime();
      
      // Set up heartbeat monitoring
      heartbeatRef.current = setInterval(checkConnectionHealth, 30000);
      
      // Handle app state changes for mobile
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/app').then(({ App }) => {
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
              console.log('📱 App became active - syncing notifications');
              syncMissedNotifications();
              checkConnectionHealth();
            }
          });
        });
      }
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  // Process queue when it changes
  useEffect(() => {
    if (queue.length > 0) {
      processQueue();
    }
  }, [queue.length]);

  return {
    connectionHealth,
    queuedNotifications: queue.length,
    backupPollingActive,
    queueNotification,
    syncMissedNotifications,
    checkConnectionHealth
  };
};