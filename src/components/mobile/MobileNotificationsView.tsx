import React, { useState } from 'react';
import { Bell, Check, CheckCheck, X, AlertCircle, CheckCircle, AlertTriangle, Info, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export const MobileNotificationsView: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    clearNotification,
    clearAllNotifications
  } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'signal':
        return <Bell className="w-5 h-5 text-emerald-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleClearNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    clearNotification(notificationId);
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !notification.read;
    return notification.type === filterType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {/* Header */}
      <div className="pt-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-6 w-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-red-400 hover:text-red-300 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-emerald-400 hover:text-emerald-300 p-2"
              >
                <CheckCheck className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
              <SelectItem value="signal">Signals</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-400 mb-4">
          {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-8 text-center bg-slate-800/30 border-slate-700">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {filterType === 'all' 
              ? 'No notifications yet' 
              : `No ${filterType} notifications`
            }
          </h3>
          <p className="text-gray-400">
            {filterType === 'all'
              ? 'When you receive notifications, they will appear here'
              : 'Try selecting a different filter'
            }
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 cursor-pointer transition-all group ${
                  notification.read
                    ? 'bg-slate-800/30 border-slate-700/50'
                    : 'bg-slate-800/50 border-emerald-500/30 shadow-lg'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className={`text-sm font-medium ${
                        notification.read ? 'text-gray-300' : 'text-white'
                      }`}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2 ml-2">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleClearNotification(e, notification.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-7 w-7 text-gray-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className={`text-sm mt-1 ${
                      notification.read ? 'text-gray-400' : 'text-gray-200'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                      {notification.data?.symbol && (
                        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                          {notification.data.symbol}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};