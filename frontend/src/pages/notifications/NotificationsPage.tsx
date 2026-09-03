import { motion } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  Check,
  Download,
  Edit3,
  Image as ImageIcon,
  RefreshCw,
  Store,
  Trash2,
} from 'lucide-react';
import EmptyState from '@components/ui/EmptyState';
import PageHeader from '@components/ui/PageHeader';
import { useNotifications, type AppNotification } from '@hooks/useNotifications';
import { motionFadeUp, motionStagger } from '../../styles/theme';
import { cn } from '../../utils/cn';
import { relativeTime } from '../../utils/time';

const ICON_CONFIG: Record<AppNotification['icon'], {
  icon: React.ElementType;
  color: string;
}> = {
  store: {
    icon: Store,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  sync: {
    icon: RefreshCw,
    color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  poster: {
    icon: ImageIcon,
    color: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  },
  edit: {
    icon: Edit3,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  export: {
    icon: Download,
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  },
  trash: {
    icon: Trash2,
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  warning: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
};

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  return (
    <div className="page-container py-7 space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Activity from your stores, posters, and exports"
        icon={Bell}
        actions={
          notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="btn btn-secondary btn-md gap-1.5"
              >
                <Check className="h-4 w-4" />
                Mark all read
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="btn btn-ghost btn-md gap-1.5 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </button>
            </div>
          )
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="New store, poster, and export activity will appear here."
        />
      ) : (
        <motion.div
          variants={motionStagger(0.035)}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {notifications.map((notification) => {
            const config = ICON_CONFIG[notification.icon];
            const Icon = config.icon;

            return (
              <motion.div
                key={notification.id}
                variants={motionFadeUp}
                className={cn(
                  'card flex items-start gap-4 p-4',
                  !notification.isRead && 'border-brand-200 dark:border-brand-800/70'
                )}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.color}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {notification.title}
                    </h2>
                    <span
                      className={cn(
                        'badge text-xs',
                        notification.isRead
                          ? 'badge-neutral'
                          : 'badge-brand'
                      )}
                    >
                      {notification.isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {notification.description}
                  </p>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {relativeTime(notification.timestamp)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className="btn btn-ghost btn-icon-sm"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(notification.id)}
                    className="btn btn-ghost btn-icon-sm text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                    aria-label="Delete notification"
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
