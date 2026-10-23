import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api/client';
import { Notification } from '../../types';
import { useToast } from '../../context/ToastContext';
import { 
  CheckCheck, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  Inbox, 
  ArrowRight 
} from 'lucide-react';

interface NotificationListProps {
  onSelectNotification?: (notif: Notification) => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onSelectNotification }) => {
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications({ limit: 100 });
      if (response.success && response.data) {
        const notifs = response.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      toast.error('Failed to synchronize notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => n.is_read === false || n.isRead === false)
          .map(n => apiService.markNotificationRead(n.id))
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Failed to mark all as read.');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'claim':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'status_update':
        return <Clock className="w-5 h-5 text-emerald-500" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-indigo-500" />;
    }
  };

  const filtered = notifications.filter(n => {
    const isUnread = n.is_read === false || n.isRead === false;
    if (filter === 'unread') return isUnread;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              GEU Dispatch Center
            </span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Automated item match alerts, claim approvals, handover notices, and campus announcements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'unread' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread
            </button>
          </div>

          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
            title="Refresh"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-slate-200/80">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-xs font-bold">Checking campus dispatcher...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-slate-200/80 space-y-3">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-blue-600 border border-blue-100">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Notifications</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
            {filter === 'unread'
              ? 'You have caught up with all campus alerts.'
              : 'You have no notifications logged in the database yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const isUnread = notif.is_read === false || notif.isRead === false;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (isUnread) markAsRead(notif.id);
                  if (onSelectNotification) onSelectNotification(notif);
                }}
                className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex items-start gap-4 ${
                  isUnread
                    ? 'bg-blue-50/50 hover:bg-blue-50 border-blue-200 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className={`p-2.5 rounded-2xl shrink-0 ${isUnread ? 'bg-white shadow-xs' : 'bg-slate-100'}`}>
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm tracking-tight truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {new Date(notif.created_at || notif.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {notif.message}
                  </p>

                  {(notif.related_item_id || notif.relatedItemId) && (
                    <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                      <span>Inspect related item</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {isUnread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5 shadow-xs" />
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
