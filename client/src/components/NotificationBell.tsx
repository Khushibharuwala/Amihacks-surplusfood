import React, { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';
import type { NotificationItem } from '../types';
import { Bell, CheckCheck, AlertTriangle, ShieldCheck, Heart, Truck } from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const loadNotifications = async () => {
    try {
      const data = await fetchApi<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/notifications/read-all', { method: 'POST' });
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'RESCUE_ALERT':
      case 'EXPIRED':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'MATCH_FOUND':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'JOB_ASSIGNED':
      case 'DRIVER_ASSIGNED':
        return <Truck className="w-4 h-4 text-amber-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 relative transition-all cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-cyan-400" /> Notifications ({unreadCount} unread)
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No recent notifications.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-xs space-y-1 ${
                    n.is_read ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-850 text-slate-200 font-semibold'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-slate-100">
                      {getNotifIcon(n.type)} {n.title}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
