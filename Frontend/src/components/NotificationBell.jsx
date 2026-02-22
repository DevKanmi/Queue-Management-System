import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../services/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = () => {
    setLoading(true);
    api
      .get('/notifications')
      .then(({ data }) => {
        setNotifications(data?.data?.notifications ?? []);
        setUnreadCount(data?.data?.unreadCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const markAllRead = () => {
    api.patch('/notifications/read-all').then(() => fetchNotifications());
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-h-[400px] overflow-hidden rounded-xl border border-border bg-surface shadow-xl z-50 flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[320px]">
            {loading ? (
              <div className="p-4 text-center text-text-muted text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-text-muted text-sm">No notifications yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`p-3 text-left ${n.read_at ? 'opacity-75' : 'bg-primary/5'}`}
                  >
                    <p className="text-sm text-text-primary">{n.message}</p>
                    <p className="text-xs text-text-muted mt-1">{formatDate(n.sent_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
