import { motion } from 'framer-motion';
import {
  Store,
  Package,
  Sparkles,
  Image,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ActivityType =
  | 'store_connected'
  | 'sync_complete'
  | 'sync_failed'
  | 'content_generated'
  | 'poster_generated'
  | 'poster_failed'
  | 'export_downloaded'
  | 'product_imported';

export interface Activity {
  id:          string;
  type:        ActivityType;
  title:       string;
  description: string;
  timestamp:   Date;
  status?:     'success' | 'warning' | 'error' | 'info';
  meta?:       string;
}


// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TYPE_META: Record<ActivityType, {
  icon:    React.ElementType;
  iconBg:  string;
  iconCls: string;
}> = {
  store_connected:    { icon: Store,       iconBg: 'bg-brand-100 dark:bg-brand-900/30',   iconCls: 'text-brand-600 dark:text-brand-400'   },
  sync_complete:      { icon: RefreshCw,   iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconCls: 'text-emerald-600 dark:text-emerald-400' },
  sync_failed:        { icon: AlertCircle, iconBg: 'bg-red-100 dark:bg-red-900/30',       iconCls: 'text-red-600 dark:text-red-400'       },
  content_generated:  { icon: Sparkles,    iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconCls: 'text-violet-600 dark:text-violet-400' },
  poster_generated:   { icon: Image,       iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',     iconCls: 'text-cyan-600 dark:text-cyan-400'     },
  poster_failed:      { icon: AlertCircle, iconBg: 'bg-red-100 dark:bg-red-900/30',       iconCls: 'text-red-600 dark:text-red-400'       },
  export_downloaded:  { icon: Download,    iconBg: 'bg-amber-100 dark:bg-amber-900/30',   iconCls: 'text-amber-600 dark:text-amber-400'   },
  product_imported:   { icon: Package,     iconBg: 'bg-slate-100 dark:bg-slate-800',      iconCls: 'text-slate-600 dark:text-slate-400'   },
};

const STATUS_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-emerald-500' },
  error:   { icon: AlertCircle,  cls: 'text-red-500'     },
  warning: { icon: AlertCircle,  cls: 'text-amber-500'   },
  info:    { icon: Clock,        cls: 'text-blue-500'     },
};

// â”€â”€â”€ Activity row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const listItemVariant = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

function ActivityRow({ activity, isLast }: { activity: Activity; isLast: boolean }) {
  const meta   = TYPE_META[activity.type];
  const Icon   = meta.icon;
  const status = activity.status ? STATUS_ICON[activity.status] : null;

  return (
    <motion.div
      variants={listItemVariant}
      className="group flex items-start gap-3 py-3"
    >
      {/* Icon + timeline line */}
      <div className="relative flex flex-col items-center">
        <div className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          'transition-transform duration-150 group-hover:scale-110',
          meta.iconBg,
        ].join(' ')}>
          <Icon className={`h-3.5 w-3.5 ${meta.iconCls}`} strokeWidth={1.8} />
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-700/60" style={{ minHeight: 16 }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {activity.title}
              </p>
              {status && (
                <status.icon className={`h-3.5 w-3.5 shrink-0 ${status.cls}`} />
              )}
              {activity.meta && (
                <span className="badge badge-neutral text-xs py-0">{activity.meta}</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {activity.description}
            </p>
          </div>
          <time
            dateTime={activity.timestamp.toISOString()}
            className="shrink-0 text-xs text-slate-400 dark:text-slate-500 mt-0.5"
          >
            {relativeTime(activity.timestamp)}
          </time>
        </div>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ActivitySkeleton() {
  return (
    <div className="space-y-4 px-4 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="skeleton h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-40 rounded" />
            <div className="skeleton h-3 w-56 rounded" />
          </div>
          <div className="skeleton h-3 w-10 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ RecentActivity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RecentActivityProps {
  activities: Activity[];
  isLoading?: boolean;
  limit?:     number;
}

const listContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export default function RecentActivity({
  activities,
  isLoading = false,
  limit = 8,
}: RecentActivityProps) {
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const items = activities.slice(0, limit);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(activities.length / pageSize));
  const paginatedItems = activities.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!showAll) setPage(1);
  }, [showAll]);

  return (
    <div className="card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Recent Activity
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Latest actions across your workspace
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="btn btn-ghost btn-sm text-brand-600 dark:text-brand-400 text-xs font-medium"
        >
          View all
        </button>
      </div>

      {/* Body â€” scrollable */}
      <div className="flex-1 overflow-y-auto max-h-[420px] scrollbar-thin px-5">
        {isLoading ? (
          <ActivitySkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No activity yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Connect a store to get started.
            </p>
          </div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="divide-y divide-slate-100 dark:divide-slate-800/60"
          >
            {items.map((activity, i) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                isLast={i === items.length - 1}
              />
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showAll && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setShowAll(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-history-title"
              className="card flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden shadow-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h2
                    id="activity-history-title"
                    className="text-base font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Activity history
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Poster generations, exports, AI content and store synchronisation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="btn btn-ghost btn-icon-sm"
                  aria-label="Close activity history"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 scrollbar-thin">
                {paginatedItems.length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-500">
                    No activity has been recorded yet.
                  </div>
                ) : (
                  <motion.div
                    key={page}
                    variants={listContainer}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-slate-100 dark:divide-slate-800/60"
                  >
                    {paginatedItems.map((activity, index) => (
                      <ActivityRow
                        key={activity.id}
                        activity={activity}
                        isLast={index === paginatedItems.length - 1}
                      />
                    ))}
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activities.length === 0
                    ? '0 activities'
                    : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, activities.length)} of ${activities.length}`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <span className="min-w-16 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="btn btn-secondary btn-sm gap-1"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


