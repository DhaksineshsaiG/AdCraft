import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  Download,
  Pencil,
  Trash2,
  Heart,
  Eye,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Clock,
  Lock,
} from 'lucide-react';
import { cn }         from '../../utils/cn';
import StatusBadge    from '../ui/StatusBadge';
import ConfirmDialog  from '../ui/ConfirmDialog';
import type { StatusVariant } from '../../styles/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PosterStatus  = 'completed' | 'processing' | 'failed' | 'pending';
export type PosterFormat  = 'jpeg' | 'png' | 'webp' | 'pdf';
export type PosterSize    = 'square' | 'portrait' | 'landscape' | 'story' | 'a4_portrait';
export type PosterStyle   = 'modern' | 'bold' | 'elegant' | 'playful' | 'minimalist' | 'vintage' | 'professional';

export interface Poster {
  id:              string;
  productName:     string;
  storeName:       string;
  posterUrl?:      string;
  thumbnailUrl?:   string;
  generationStatus: PosterStatus;
  format:          PosterFormat;
  size:            PosterSize;
  style:           PosterStyle;
  version:         number;
  isFavourited:    boolean;
  totalDownloads:  number;
  createdAt:       Date;
  editableUntil:   Date;
  isEditable:      boolean;
  editableSvg?:    string;
  editState?:      unknown;
  editHistory?:    unknown[];
}

interface PosterCardProps {
  poster:       Poster;
  onPreview:    (id: string) => void;
  onExport:     (id: string) => void;
  onEdit:       (id: string) => void;
  onDelete:     (id: string) => void;
  onFavourite:  (id: string) => void;
  className?:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<PosterStatus, { variant: StatusVariant; label: string; pulse: boolean }> = {
  completed:  { variant: 'success', label: 'Ready',       pulse: false },
  processing: { variant: 'info',    label: 'Generating…', pulse: true  },
  failed:     { variant: 'error',   label: 'Failed',      pulse: false },
  pending:    { variant: 'neutral', label: 'Queued',      pulse: false },
};

const FORMAT_LABEL: Record<PosterFormat, string> = {
  jpeg: 'JPEG', png: 'PNG', webp: 'WEBP', pdf: 'PDF',
};

const SIZE_LABEL: Record<PosterSize, string> = {
  square:      'Instagram Post',
  portrait:    'Instagram Portrait',
  landscape:   'Website Banner',
  story:       'Instagram Story',
  a4_portrait: 'A4 Print',
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

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatEditableMetadata(ms: number): string {
  if (ms <= 0) return 'Editing expired';
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) return `Editable for ${days}d ${hours}h`;
  if (hours > 0) return `Editable for ${hours}h ${mins}m`;
  return `Editable for ${mins}m`;
}

function formatEditableIndicator(ms: number): string {
  if (ms <= 0) return '';
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

// ─── PosterCard ───────────────────────────────────────────────────────────────

export default function PosterCard({
  poster,
  onPreview,
  onExport,
  onEdit,
  onDelete,
  onFavourite,
  className,
}: PosterCardProps) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const statusCfg   = STATUS_MAP[poster.generationStatus];
  const isReady     = poster.generationStatus === 'completed';
  const isProcessing= poster.generationStatus === 'processing';
  const editableMs = poster.editableUntil.getTime() - now;
  const isEditable = poster.isEditable && editableMs > 0;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0  }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className={cn('card group flex flex-col overflow-hidden', className)}
      >
        {/* ── Poster image ──────────────────────────────────────────────── */}
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">

          {/* Image or placeholder */}
          {poster.thumbnailUrl || poster.posterUrl ? (
            <img
              src={poster.thumbnailUrl ?? poster.posterUrl}
              alt={`Poster for ${poster.productName}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : isProcessing ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Generating…</span>
            </div>
          ) : poster.generationStatus === 'failed' ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <span className="text-xs text-red-500">Generation failed</span>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" strokeWidth={1.2} />
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <StatusBadge
              status={statusCfg.variant}
              label={statusCfg.label}
              pulse={statusCfg.pulse}
              size="xs"
            />
          </div>

          {/* Favourite button */}
          <button
            onClick={() => onFavourite(poster.id)}
            aria-label={poster.isFavourited ? 'Remove from favourites' : 'Add to favourites'}
            className={cn(
              'absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full',
              'transition-all duration-150',
              poster.isFavourited
                ? 'bg-red-100 dark:bg-red-900/30 text-red-500 opacity-100'
                : 'bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-red-500'
            )}
            title={poster.isFavourited ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              className="h-3.5 w-3.5"
              fill={poster.isFavourited ? 'currentColor' : 'none'}
            />
          </button>

          {/* Quiet edit availability indicator */}
          <span
            className={cn(
              'pointer-events-none absolute bottom-2 right-2 z-20 inline-flex h-7 max-w-[4.5rem] items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold shadow-sm backdrop-blur-md transition-opacity duration-300',
              isEditable
                ? 'border-white/20 bg-slate-950/35 text-white/85'
                : 'border-white/10 bg-slate-950/25 text-white/60 opacity-55'
            )}
            title={isEditable ? `Editable until ${formatDateTime(poster.editableUntil)}` : 'Editing expired'}
          >
            {isEditable ? <Pencil className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
            {isEditable && <span className="truncate">{formatEditableIndicator(editableMs)}</span>}
          </span>

          {/* Hover action bar */}
          {isReady && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
              <button
                onClick={() => onPreview(poster.id)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow hover:bg-white dark:hover:bg-slate-900 transition-colors"
                aria-label="Preview poster"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => onExport(poster.id)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow hover:bg-brand-600 transition-colors"
                aria-label="Export poster"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => isEditable && onEdit(poster.id)}
                disabled={!isEditable}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl shadow transition-colors',
                  isEditable
                    ? 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900'
                    : 'bg-white/70 dark:bg-slate-900/70 text-slate-400 cursor-not-allowed'
                )}
                aria-label={isEditable ? 'Edit poster' : 'Editing expired'}
                title={isEditable ? 'Edit poster' : 'Editing expired'}
              >
                {isEditable ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* ── Card body ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 p-3.5">
          {/* Title */}
          <p
            className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight"
            title={poster.productName}
          >
            {poster.productName}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="badge badge-neutral text-xs py-0">{FORMAT_LABEL[poster.format]}</span>
              <span className="badge badge-neutral text-xs py-0">{SIZE_LABEL[poster.size]}</span>
              <span className="badge badge-neutral text-xs py-0 capitalize">{poster.style}</span>
              {poster.version > 1 && (
                <span className="badge badge-brand text-xs py-0">v{poster.version}</span>
              )}
            </div>
            <span
              className={cn(
                'ml-auto text-right text-xs leading-tight',
                isEditable
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-slate-400 dark:text-slate-600'
              )}
              title={isEditable ? `Editable until ${formatDateTime(poster.editableUntil)}` : 'Editing expired'}
            >
              {formatEditableMetadata(editableMs)}
            </span>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Clock className="h-3 w-3 shrink-0" />
              {relativeTime(poster.createdAt)}
            </div>

            <div className="flex items-center gap-1 relative">
              {/* Downloads */}
              {poster.totalDownloads > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-slate-400 dark:text-slate-500">
                  <Download className="h-3 w-3" />
                  {poster.totalDownloads}
                </span>
              )}

              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                  className="btn btn-ghost btn-icon-sm -mr-1"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {menuOpen && (
                  <div className="dropdown-menu right-0 bottom-full mb-1 w-44 z-20">
                    {isReady && (
                      <>
                        <button className="dropdown-item w-full text-left"
                          onClick={() => { setMenuOpen(false); onPreview(poster.id); }}>
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          Preview
                        </button>
                        <button className="dropdown-item w-full text-left"
                          onClick={() => { setMenuOpen(false); onExport(poster.id); }}>
                          <Download className="h-3.5 w-3.5 text-slate-400" />
                          Export
                        </button>
                      </>
                    )}
                    <button
                      className={cn('dropdown-item w-full text-left', !isEditable && 'opacity-50 cursor-not-allowed')}
                      disabled={!isEditable}
                      title={isEditable ? 'Edit poster' : `Editing expired on ${formatDateTime(poster.editableUntil)}`}
                      onClick={() => {
                        if (!isEditable) return;
                        setMenuOpen(false);
                        onEdit(poster.id);
                      }}
                    >
                      {isEditable ? <Pencil className="h-3.5 w-3.5 text-slate-400" /> : <Lock className="h-3.5 w-3.5 text-slate-400" />}
                      {isEditable ? 'Edit' : 'Editing locked'}
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    <button className="dropdown-item dropdown-item-danger w-full text-left"
                      onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); onDelete(poster.id); }}
        variant="danger"
        title={`Delete poster?`}
        description="This poster will be permanently deleted from storage. This cannot be undone."
        confirmLabel="Delete poster"
      />
    </>
  );
}
