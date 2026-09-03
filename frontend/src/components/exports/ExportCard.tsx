import { motion } from 'framer-motion';
import {
  Download,
  RefreshCw,
  FileImage,
  FileType,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HourglassIcon,
} from 'lucide-react';
import { cn }        from '../../utils/cn';
import StatusBadge   from '../ui/StatusBadge';
import type { StatusVariant } from '../../styles/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ExportFormat = 'jpeg' | 'png' | 'webp' | 'pdf';

export interface ExportRecord {
  id:           string;
  posterId:     string;
  posterName:   string;
  storeName:    string;
  format:       ExportFormat;
  status:       ExportStatus;
  fileSizeKb?:  number;
  downloadUrl?: string;
  errorMessage?:string;
  exportedAt:   Date;
  completedAt?: Date;
}

interface ExportCardProps {
  record:      ExportRecord;
  onDownload:  (id: string) => void;
  onRetry:     (id: string) => void;
  className?:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<ExportStatus, { variant: StatusVariant; label: string; pulse: boolean }> = {
  queued:     { variant: 'neutral', label: 'Queued',     pulse: false },
  processing: { variant: 'info',    label: 'Processing', pulse: true  },
  completed:  { variant: 'success', label: 'Ready',      pulse: false },
  failed:     { variant: 'error',   label: 'Failed',     pulse: false },
};

const FORMAT_LABEL: Record<ExportFormat, string> = {
  jpeg: 'JPEG', png: 'PNG', webp: 'WEBP', pdf: 'PDF',
};

const STATUS_ICON: Record<ExportStatus, React.ElementType> = {
  queued:     HourglassIcon,
  processing: Loader2,
  completed:  CheckCircle2,
  failed:     AlertCircle,
};

const STATUS_ICON_CLASS: Record<ExportStatus, string> = {
  queued:     'text-slate-400',
  processing: 'text-blue-500 animate-spin',
  completed:  'text-emerald-500',
  failed:     'text-red-500',
};

function relativeTime(date: Date): string {
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ─── ExportCard ───────────────────────────────────────────────────────────────

export default function ExportCard({
  record,
  onDownload,
  onRetry,
  className,
}: ExportCardProps) {
  const statusCfg = STATUS_MAP[record.status];
  const Icon      = STATUS_ICON[record.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'card group flex flex-col sm:flex-row sm:items-center gap-4 p-4',
        className
      )}
    >
      {/* ── Status icon ──────────────────────────────────────────────────── */}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        record.status === 'completed'  && 'bg-emerald-100 dark:bg-emerald-900/25',
        record.status === 'failed'     && 'bg-red-100 dark:bg-red-900/25',
        record.status === 'processing' && 'bg-blue-100 dark:bg-blue-900/25',
        record.status === 'queued'     && 'bg-slate-100 dark:bg-slate-800',
      )}>
        <Icon className={cn('h-5 w-5 shrink-0', STATUS_ICON_CLASS[record.status])} strokeWidth={1.8} />
      </div>

      {/* ── Main info ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {record.posterName}
          </p>
          <StatusBadge
            status={statusCfg.variant}
            label={statusCfg.label}
            pulse={statusCfg.pulse}
            size="xs"
          />
        </div>

        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5">
          {/* Format badge */}
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            {record.format === 'pdf' ? <FileType className="h-3 w-3" /> : <FileImage className="h-3 w-3" />}
            {FORMAT_LABEL[record.format]}
          </span>

          {/* Store */}
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {record.storeName}
          </span>

          {/* File size */}
          {record.fileSizeKb && record.status === 'completed' && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatFileSize(record.fileSizeKb)}
            </span>
          )}

          {/* Timestamp */}
          <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Clock className="h-3 w-3 shrink-0" />
            {relativeTime(record.exportedAt)}
          </span>
        </div>

        {/* Error message */}
        {record.status === 'failed' && record.errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {record.errorMessage}
          </p>
        )}
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {record.status === 'completed' && record.downloadUrl && (
          <button
            onClick={() => onDownload(record.id)}
            className="btn btn-primary btn-sm gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        )}

        {record.status === 'failed' && (
          <button
            onClick={() => onRetry(record.id)}
            className="btn btn-secondary btn-sm gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}

        {record.status === 'processing' && (
          <span className="text-xs text-blue-500 dark:text-blue-400 font-medium animate-pulse">
            Generating…
          </span>
        )}

        {record.status === 'queued' && (
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Waiting…
          </span>
        )}
      </div>
    </motion.div>
  );
}
