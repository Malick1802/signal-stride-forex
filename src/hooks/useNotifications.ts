
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'signal';
  read: boolean;
  data?: any;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Since user_notifications table doesn't exist in types, we'll use a mock implementation
      // In production, you would either:
      // 1. Create the user_notifications table
      // 2. Use an existing table like admin_notifications with user filtering
      
      // For now, let's create mock notifications to demonstrate the functionality
      const mockNotifications: UserNotification[] = [
        {
          id: '1',
          title: '🚨 New EUR/USD Signal',
          message: 'BUY signal at 1.0850 | SL: 1.0800 | TP: 1.0900',
          type: 'signal',
          read: false,
          data: { signalId: '123', type: 'new_signal' },
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: '✅ Target Hit!',
          message: 'GBP/USD BUY reached TP1 at 1.2650',
          type: 'success',
          read: false,
          data: { signalId: '124', type: 'target_hit' },
          created_at: new Date(Date.now() - 300000).toISOString()
        }
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // In production, you would update the database here
      console.log('Marking notification as read:', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      // Update local state immediately
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      // In production, you would update the database here
      console.log('Marking all notifications as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    // In production, you would set up real-time subscription here
    // For now, we'll simulate new notifications every 30 seconds
    const interval = setInterval(() => {
      const newNotification: UserNotification = {
        id: Date.now().toString(),
        title: '📊 Market Update',
        message: 'USD showing strength across major pairs',
        type: 'info',
        read: false,
        data: { type: 'market_update' },
        created_at: new Date().toISOString()
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
