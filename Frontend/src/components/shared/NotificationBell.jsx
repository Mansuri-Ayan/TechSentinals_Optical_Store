import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckSquare, Clock } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useStoreStore } from '../../store/store';

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function NotificationBell({ role = 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { selectedStore } = useStoreStore();
  const { notifications, unreadCount, markReadAsync, markAllReadAsync } = useNotifications();

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    
    // Mark as read
    if (!notif.is_read) {
      await markReadAsync(notif.id);
    }

    if (notif.related_transaction_id) {
      const formattedTxnId = `TXN-${String(notif.related_transaction_id).padStart(6, '0')}`;
      if (role === 'admin') {
        const storeId = selectedStore?.id || 'warehouse';
        navigate(`/admin/store/${storeId}/transactions?search=${formattedTxnId}`);
      } else {
        navigate(`/shopkeeper/transactions?search=${formattedTxnId}`);
      }
    } else {
      if (role === 'admin') {
        const storeId = selectedStore?.id || 'warehouse';
        navigate(`/admin/store/${storeId}/transactions`);
      } else {
        navigate(`/shopkeeper/transactions`);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadAsync()}
                className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer focus:outline-none"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 min-h-0 max-h-[360px] hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-800">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-1">We'll let you know when there are inventory updates.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-5 py-4 text-left transition-colors cursor-pointer hover:bg-slate-50/80 flex items-start gap-3 relative ${
                    !notif.is_read ? 'bg-blue-50/20' : ''
                  }`}
                >
                  {/* Unread Indicator dot */}
                  {!notif.is_read && (
                    <span className="absolute top-4.5 right-4.5 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  
                  {/* Icon */}
                  <div className={`p-2 rounded-xl border flex-shrink-0 mt-0.5 ${
                    !notif.is_read 
                      ? 'bg-blue-50 border-blue-100 text-blue-600'
                      : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <p className={`text-xs font-bold text-slate-800 truncate`}>{notif.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed break-words">{notif.message}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 font-semibold">
                      <Clock className="w-3 h-3" />
                      {timeAgo(notif.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
