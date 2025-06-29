
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
    if (!user) return;

    try {
      // Use raw SQL query to bypass TypeScript type issues
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT id, title, message, type, read, data, created_at
          FROM user_notifications 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 50
        `,
        params: [user.id]
      });

      if (error) {
        console.error('Error fetching notifications:', error);
        // Fallback: try direct query (might work if types are updated)
        const fallbackQuery = await supabase
          .from('user_notifications' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (fallbackQuery.data) {
          const typedData = fallbackQuery.data as UserNotification[];
          setNotifications(typedData);
          setUnreadCount(typedData.filter(n => !n.read).length);
        }
        return;
      }

      if (data) {
        const typedData = data as UserNotification[];
        setNotifications(typedData);
        setUnreadCount(typedData.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set empty state on error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      // Use raw SQL query
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          UPDATE user_notifications 
          SET read = true, updated_at = NOW() 
          WHERE id = $1 AND user_id = $2
        `,
        params: [notificationId, user.id]
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      // Use raw SQL query
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          UPDATE user_notifications 
          SET read = true, updated_at = NOW() 
          WHERE user_id = $1 AND read = false
        `,
        params: [user.id]
      });

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription using channel subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as UserNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as UserNotification;
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          fetchNotifications(); // Refresh to update count
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
