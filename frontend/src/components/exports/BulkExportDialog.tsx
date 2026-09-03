import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Check, FileImage, FileType, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ExportFormat } from './ExportCard';

const PRO_UI_ENABLED = false;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ExportQuality = 'standard' | 'high' | 'ultra';

export interface BulkExportPoster {
  id:    string;
  name:  string;
  store: string;
}

interface BulkExportDialogProps {
  open:       boolean;
  posters:    BulkExportPoster[];
  onClose:    () => void;
  onExport:   (posterIds: string[], format: ExportFormat, quality: ExportQuality) => void | Promise<void>;
}

// ─── Option config ────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: Array<{
  value:       ExportFormat;
  label:       string;
  description: string;
  icon:        React.ElementType;
}> = [
  { value: 'jpeg', label: 'JPEG', description: 'Smallest size, great for web',       icon: FileImage },
  { value: 'png',  label: 'PNG',  description: 'Lossless with transparency support',  icon: FileImage },
  { value: 'webp', label: 'WEBP', description: 'Modern format, excellent quality',    icon: FileImage },
  { value: 'pdf',  label: 'PDF',  description: 'Best for printing & sharing',         icon: FileType  },
];

const ALL_QUALITY_OPTIONS: Array<{
  value:       ExportQuality;
  label:       string;
  description: string;
  badge?:      string;
}> = [
  { value: 'standard', label: 'Standard', description: 'Fast export, good quality'          },
  { value: 'high',     label: 'High',     description: 'Balanced quality and file size'      },
  { value: 'ultra',    label: 'Ultra',    description: 'Maximum quality, larger file size', badge: 'Pro' },
];

const QUALITY_OPTIONS = ALL_QUALITY_OPTIONS.filter((option) =>
  PRO_UI_ENABLED || option.value !== 'ultra'
);

// ─── Framer Motion helpers ────────────────────────────────────────────────────

const backdropVariant = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.15 } },
  exit:   { opacity: 0, transition: { duration: 0.12 } },
};

const panelVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 8  },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit:   { opacity: 0, scale: 0.95, y: 4, transition: { duration: 0.14, ease: [0.4, 0, 1, 1]  } },
};

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected:  boolean;
  onClick:   () => void;
  children:  React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left',
        'transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        selected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/15'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      )}
    >
      {children}
      {selected && (
        <div className="absolute top-2 right-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}
    </button>
  );
}

// ─── BulkExportDialog ────────────────────────────────────────────────────────

export default function BulkExportDialog({
  open,
  posters,
  onClose,
  onExport,
}: BulkExportDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(posters.map((p) => p.id))
  );
  const [format,      setFormat]      = useState<ExportFormat>('jpeg');
  const [quality,     setQuality]     = useState<ExportQuality>('high');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(posters.map((p) => p.id)));
    }
  }, [open, posters]);

  function togglePoster(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === posters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posters.map((p) => p.id)));
    }
  }

  async function handleExport() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      await onExport(Array.from(selectedIds), format, quality);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  const allSelected = selectedIds.size === posters.length && posters.length > 0;

  const dialog = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            variants={backdropVariant}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-export-title"
          >
            <motion.div
              key="panel"
              variants={panelVariant}
              initial="hidden"
              animate="show"
              exit="exit"
              className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 id="bulk-export-title" className="text-base font-semibold text-slate-900 dark:text-white">
                    Bulk Export
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="btn btn-ghost btn-icon-sm text-slate-400"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">

                {/* Poster selection */}
                <section aria-labelledby="poster-select-label">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 id="poster-select-label" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Select posters
                    </h3>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  {posters.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                      No completed posters available for export.
                    </p>
                  ) : (
                    <div
                      role="group"
                      aria-label="Poster selection"
                      className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin pr-1"
                    >
                      {posters.map((poster) => {
                        const checked = selectedIds.has(poster.id);
                        return (
                          <label
                            key={poster.id}
                            className={cn(
                              'flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 cursor-pointer',
                              'transition-all duration-150',
                              checked
                                ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/15 dark:border-brand-700'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePoster(poster.id)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {poster.name}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                {poster.store}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Format */}
                <section aria-labelledby="format-label">
                  <h3 id="format-label" className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2.5">
                    File format
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {FORMAT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <OptionButton
                          key={opt.value}
                          selected={format === opt.value}
                          onClick={() => setFormat(opt.value)}
                        >
                          <div className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            format === opt.value
                              ? 'bg-brand-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          )}>
                            <Icon className="h-4 w-4" strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0 pr-5">
                            <p className={cn(
                              'text-xs font-semibold',
                              format === opt.value
                                ? 'text-brand-700 dark:text-brand-300'
                                : 'text-slate-700 dark:text-slate-300'
                            )}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                              {opt.description}
                            </p>
                          </div>
                        </OptionButton>
                      );
                    })}
                  </div>
                </section>

                {/* Quality */}
                <section aria-labelledby="quality-label">
                  <h3 id="quality-label" className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2.5">
                    Export quality
                  </h3>
                  <div className="space-y-1.5">
                    {QUALITY_OPTIONS.map((opt) => (
                      <OptionButton
                        key={opt.value}
                        selected={quality === opt.value}
                        onClick={() => setQuality(opt.value)}
                      >
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              'text-xs font-semibold',
                              quality === opt.value
                                ? 'text-brand-700 dark:text-brand-300'
                                : 'text-slate-700 dark:text-slate-300'
                            )}>
                              {opt.label}
                            </p>
                            {opt.badge && (
                              <span className="badge badge-brand text-xs py-0">{opt.badge}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {opt.description}
                          </p>
                        </div>
                      </OptionButton>
                    ))}
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4 shrink-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedIds.size}
                  </span>
                  {' '}poster{selectedIds.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="btn btn-secondary btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={loading || selectedIds.size === 0}
                    className={cn(
                      'btn btn-primary btn-md gap-1.5',
                      loading && 'btn-loading'
                    )}
                  >
                    {!loading && <Download className="h-4 w-4" />}
                    {!loading && `Export ${selectedIds.size > 0 ? selectedIds.size : ''}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(dialog, document.body);
}
