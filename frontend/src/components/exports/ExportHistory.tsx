import { motion, AnimatePresence } from 'framer-motion';
import { Download as DownloadIcon } from 'lucide-react';
import ExportCard, { type ExportRecord } from './ExportCard';
import EmptyState from '../ui/EmptyState';
import { cn }    from '../../utils/cn';
import { motionStagger, motionFadeUp } from '../../styles/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExportHistoryProps {
  records:     ExportRecord[];
  isLoading?:  boolean;
  onDownload:  (id: string) => void;
  onRetry:     (id: string) => void;
  className?:  string;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function ExportSkeleton() {
  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4 p-4 animate-pulse">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-36 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
    </div>
  );
}

// ─── ExportHistory ────────────────────────────────────────────────────────────

export default function ExportHistory({
  records,
  isLoading = false,
  onDownload,
  onRetry,
  className,
}: ExportHistoryProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <ExportSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={DownloadIcon}
        title="No exports found"
        description="Exports you create from the Posters page will appear here."
        variant="default"
        className={className}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="history-list"
        variants={motionStagger(0.05)}
        initial="hidden"
        animate="show"
        className={cn('space-y-3', className)}
      >
        {records.map((record) => (
          <motion.div key={record.id} variants={motionFadeUp}>
            <ExportCard
              record={record}
              onDownload={onDownload}
              onRetry={onRetry}
            />
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
