import React, { useState, useEffect } from 'react';
import {
  Bell,
  ArrowLeft,
  Gift,
  Coins,
  ArrowDown,
  FileText,
  ArrowUp,
  ShieldCheck,
  ChevronRight,
  CheckCheck,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  AppNotification,
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToRealtimeNotifications,
} from '../lib/supabase';

interface NotificationCenterViewProps {
  currentUser?: any;
  onClose?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

// Default fallback items matching the screenshot
const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    user_id: 'demo',
    title: 'Welcome to TokenCare',
    message: 'Your account is verified and ready for EVM token donations and reward tracking.',
    type: 'SYSTEM',
    is_read: false,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    metadata: { badge: 'New', category: 'system', icon: 'gift', color: 'purple' },
  },
  {
    id: 'n2',
    user_id: 'demo',
    title: 'Reward System Active',
    message: 'Earn +15 REWARD tokens for every verified ERC-20 token contract submitted.',
    type: 'REWARD_EARNED',
    is_read: false,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    metadata: { badge: 'Reward', category: 'rewards', icon: 'coins', color: 'emerald' },
  },
  {
    id: 'n3',
    user_id: 'demo',
    title: 'Withdrawal Completed',
    message: 'Your withdrawal of 250 REWARD tokens has been completed successfully.',
    type: 'WITHDRAWAL_APPROVED',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: { badge: 'Success', category: 'transactions', icon: 'arrow-down', color: 'blue' },
  },
  {
    id: 'n4',
    user_id: 'demo',
    title: 'New Token Verification',
    message: 'A new token contract has been submitted for verification.',
    type: 'SYSTEM',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    metadata: { badge: 'Info', category: 'system', icon: 'file', color: 'amber' },
  },
  {
    id: 'n5',
    user_id: 'demo',
    title: 'Donation Received',
    message: 'You received a donation of 100 USDT from 0x8a7...12f3',
    type: 'TOKEN_DONATED',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metadata: { badge: 'Donation', category: 'transactions', icon: 'arrow-up', color: 'emerald' },
  },
  {
    id: 'n6',
    user_id: 'demo',
    title: 'Security Alert',
    message: 'New login detected from Chrome on Windows • Benin City, Nigeria',
    type: 'SECURITY_ALERT',
    is_read: true,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    metadata: { badge: 'Alert', category: 'system', icon: 'shield', color: 'purple' },
  },
];

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  currentUser,
  onClose,
  onNavigateToTab,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'rewards' | 'transactions' | 'system'>('all');

  const userId = currentUser?.id || 'demo-user-id';

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchUserNotifications(userId);
      const list = data && data.length > 0 ? data : DEFAULT_NOTIFICATIONS;
      const dedupped = deduplicateNotifications(list);
      setNotifications(dedupped);
      
      const unread = dedupped.filter((n) => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
      const dedupped = deduplicateNotifications(DEFAULT_NOTIFICATIONS);
      setNotifications(dedupped);
      const unread = dedupped.filter((n) => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    } finally {
      setLoading(false);
    }
  };

  const deduplicateNotifications = (list: AppNotification[]) => {
    const result: AppNotification[] = [];
    for (const item of list) {
      const isDuplicate = result.some((existing) => {
        const sameTitle = (existing.title || '').trim().toLowerCase() === (item.title || '').trim().toLowerCase();
        const sameMsg = (existing.message || '').trim().toLowerCase() === (item.message || '').trim().toLowerCase();
        const timeDiff = Math.abs(new Date(existing.created_at).getTime() - new Date(item.created_at).getTime());
        return sameTitle && (sameMsg || timeDiff < 300000);
      });
      if (!isDuplicate) {
        result.push(item);
      }
    }
    return result;
  };

  // 1. Load & listen for real-time notifications
  useEffect(() => {
    loadNotifications();

    const unsubscribe = subscribeToRealtimeNotifications(userId, () => {
      loadNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (target && target.is_read) return;

    await markNotificationAsRead(id, userId);
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      const unread = updated.filter((n) => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
      return updated;
    });
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  const handleClearAll = () => {
    setNotifications([]);
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  // Category counts
  const rewardsCount = notifications.filter(
    (n) => n.type === 'TOKEN_DONATED' || n.type === 'REWARD_EARNED' || n.metadata?.category === 'rewards'
  ).length;
  const transactionsCount = notifications.filter(
    (n) =>
      n.type === 'WITHDRAWAL_SUBMITTED' ||
      n.type === 'WITHDRAWAL_APPROVED' ||
      n.type === 'WITHDRAWAL_FAILED' ||
      n.metadata?.category === 'transactions'
  ).length;
  const systemCount = notifications.filter(
    (n) => n.type === 'SECURITY_ALERT' || n.type === 'SYSTEM' || n.metadata?.category === 'system'
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'rewards') {
      return n.type === 'TOKEN_DONATED' || n.type === 'REWARD_EARNED' || n.metadata?.category === 'rewards';
    }
    if (activeFilter === 'transactions') {
      return (
        n.type === 'WITHDRAWAL_SUBMITTED' ||
        n.type === 'WITHDRAWAL_APPROVED' ||
        n.type === 'WITHDRAWAL_FAILED' ||
        n.metadata?.category === 'transactions'
      );
    }
    if (activeFilter === 'system') {
      return n.type === 'SECURITY_ALERT' || n.type === 'SYSTEM' || n.metadata?.category === 'system';
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getItemIcon = (n: AppNotification) => {
    const iconKey = n.metadata?.icon || '';
    const title = (n.title || '').toLowerCase();
    const type = (n.type || '').toUpperCase();

    if (iconKey === 'shield' || type === 'SECURITY_ALERT' || type === 'SECURITY' || title.includes('login') || title.includes('security')) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
      );
    }
    if (iconKey === 'coins' || type === 'REWARD_EARNED' || title.includes('reward')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
          <Coins className="w-4 h-4" />
        </div>
      );
    }
    if (iconKey === 'gift' || title.includes('welcome')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
          <Gift className="w-4 h-4" />
        </div>
      );
    }
    if (iconKey === 'arrow-down' || type === 'WITHDRAWAL_APPROVED' || title.includes('approved')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
          <ArrowDown className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'WITHDRAWAL_FAILED' || title.includes('rejected')) {
      return (
        <div className="w-8 h-8 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <ArrowUp className="w-4 h-4" />
        </div>
      );
    }
    if (iconKey === 'file' || title.includes('token verification') || title.includes('token submitted')) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#4ADE80] shrink-0">
        <Bell className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-2.5 pt-0 pb-4 animate-in fade-in duration-300 select-none">
      
      {/* 1. TOP HEADER - CLEAN & UNIFIED */}
      <div className="flex items-center justify-between px-3.5 pt-2 pb-2.5 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 bg-[#121624] hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 transition-colors cursor-pointer flex items-center space-x-1 text-xs font-bold"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Back</span>
            </button>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                Notifications
                <div className="relative inline-flex items-center">
                  <Bell className="w-4 h-4 text-[#4ADE80]" />
                  {unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.9)] animate-pulse absolute -top-0.5 -right-1" />
                  )}
                </div>
              </h1>
            </div>
            <p className="text-[10.5px] text-zinc-400 font-sans mt-0.5">
              Stay updated with your activity.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <span className="bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#4ADE80] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
            {unreadCount} unread
          </span>
        )}
      </div>

      {/* 2. CATEGORY TAB FILTER PILLS */}
      <div className="mx-3 bg-[#090C14] border border-zinc-800/80 rounded-xl p-1 flex items-center justify-between shadow-sm">
        {[
          { id: 'all', label: 'All', count: notifications.length },
          { id: 'rewards', label: 'Rewards', count: rewardsCount },
          { id: 'transactions', label: 'Transactions', count: transactionsCount },
          { id: 'system', label: 'System', count: systemCount },
        ].map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`flex-1 py-1.5 px-1 rounded-lg text-[10.5px] font-semibold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#103426] text-[#4ADE80] border border-[#22C55E]/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-[#22C55E]/20 text-[#4ADE80]'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. NOTIFICATION CARDS & LIST ITEMS */}
      <div className="px-3">
        {loading ? (
          <div className="p-6 text-center space-y-2 bg-[#0B0E17] border border-zinc-800/80 rounded-xl">
            <RefreshCw className="w-5 h-5 text-[#4ADE80] animate-spin mx-auto" />
            <p className="text-[11px] text-zinc-400">Loading activity updates...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-6 text-center space-y-1.5 bg-[#0B0E17] border border-zinc-800/80 rounded-xl">
            <Bell className="w-6 h-6 text-zinc-600 mx-auto" />
            <h3 className="text-xs font-bold text-white">No notifications in this tab</h3>
            <p className="text-[10px] text-zinc-500">Check back later for real-time activity updates.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 border-t border-b border-zinc-800/60">
            {filteredNotifications.map((n) => {
              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  className="w-full py-3 px-2 flex items-start space-x-2.5 transition-colors hover:bg-[#0C101A]/80 cursor-pointer group"
                >
                  {/* Left Unread Green Dot Indicator */}
                  <div className="w-2.5 pt-1.5 shrink-0 flex items-center justify-center">
                    {!n.is_read ? (
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.9)] animate-pulse" title="Unread" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-transparent" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="pt-0.5 shrink-0">
                    {getItemIcon(n)}
                  </div>

                  {/* Text Content */}
                  <div className="min-w-0 flex-1 pr-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-bold transition-colors truncate ${!n.is_read ? 'text-white group-hover:text-[#4ADE80]' : 'text-zinc-300 group-hover:text-white'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {formatTimeAgo(n.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug font-sans line-clamp-2">
                      {n.message}
                    </p>
                  </div>

                  {/* Right Subtle Chevron */}
                  <div className="pt-1.5 shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Mark All Read & Clear option footer */}
      {notifications.length > 0 && (
        <div className="pt-1 px-3 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center space-x-1 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3 h-3 text-emerald-400" />
            <span>Mark all as read</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center space-x-1 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>Clear activity log</span>
          </button>
        </div>
      )}

    </div>
  );
};
