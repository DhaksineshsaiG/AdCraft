import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  open:           boolean;
  onConfirm:      () => void | Promise<void>;
  onCancel:       () => void;
  title:          string;
  description?:   string | ReactNode;
  variant?:       ConfirmVariant;
  confirmLabel?:  string;
  cancelLabel?:   string;
  /** Show a spinner on the confirm button while async action is in flight */
  loading?:       boolean;
  /** Custom icon — overrides the variant default */
  icon?:          ReactNode;
  className?:     string;
}

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ConfirmVariant, {
  iconNode:     ReactNode;
  iconBg:       string;
  confirmCls:   string;
  defaultLabel: string;
}> = {
  danger: {
    iconNode:     <Trash2  className="h-5 w-5 text-red-600 dark:text-red-400"   strokeWidth={1.8} />,
    iconBg:       'bg-red-100 dark:bg-red-900/30',
    confirmCls:   'btn-danger',
    defaultLabel: 'Delete',
  },
  warning: {
    iconNode:     <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={1.8} />,
    iconBg:       'bg-amber-100 dark:bg-amber-900/30',
    confirmCls:   'btn btn-md bg-amber-500 hover:bg-amber-600 text-white border-transparent',
    defaultLabel: 'Continue',
  },
  info: {
    iconNode:     <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={1.8} />,
    iconBg:       'bg-blue-100 dark:bg-blue-900/30',
    confirmCls:   'btn-primary',
    defaultLabel: 'Confirm',
  },
  success: {
    iconNode:     <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />,
    iconBg:       'bg-emerald-100 dark:bg-emerald-900/30',
    confirmCls:   'btn btn-md bg-emerald-600 hover:bg-emerald-700 text-white border-transparent',
    defaultLabel: 'Confirm',
  },
};

// ─── Motion variants ──────────────────────────────────────────────────────────

const backdropVariant = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.15 } },
  exit:   { opacity: 0, transition: { duration: 0.12 } },
};

const panelVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } },
  exit:   { opacity: 0, scale: 0.95, y: 4, transition: { duration: 0.12, ease: [0.4, 0, 1, 1]   } },
};

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  variant      = 'danger',
  confirmLabel,
  cancelLabel  = 'Cancel',
  loading      = false,
  icon,
  className,
}: ConfirmDialogProps) {
  const cfg          = VARIANT_CONFIG[variant];
  const resolvedIcon = icon ?? cfg.iconNode;
  const label        = confirmLabel ?? cfg.defaultLabel;

  // Focus the cancel button on open (safer default for destructive dialogs)
  const cancelRef = useRef<HTMLButtonElement>(null);
  // useEffect(() => {
  //   if (open) {
  //     // Defer so AnimatePresence has mounted the node
  //     const timer = setTimeout(() => cancelRef.current?.focus(), 50);
  //     return () => clearTimeout(timer);
  //   }
  // }, [open]);
  useEffect(() => {
  if (!open) return;

  // Defer so AnimatePresence has mounted the node
  const timer = setTimeout(() => cancelRef.current?.focus(), 50);

  return () => clearTimeout(timer);
}, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, loading, onCancel]);

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
            aria-hidden="true"
            onClick={() => { if (!loading) onCancel(); }}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={description ? 'confirm-dialog-desc' : undefined}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              key="panel"
              variants={panelVariant}
              initial="hidden"
              animate="show"
              exit="exit"
              className={cn(
                'relative w-full max-w-md rounded-2xl shadow-2xl',
                'bg-white dark:bg-slate-900',
                'border border-slate-200 dark:border-slate-800',
                className
              )}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                aria-label="Close dialog"
                className="absolute right-4 top-4 btn btn-ghost btn-icon-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Body */}
              <div className="p-6">
                {/* Icon + title */}
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                      cfg.iconBg
                    )}
                    aria-hidden="true"
                  >
                    {resolvedIcon}
                  </div>

                  <div className="pt-0.5 flex-1 min-w-0 pr-6">
                    <h2
                      id="confirm-dialog-title"
                      className="text-base font-semibold text-slate-900 dark:text-white leading-tight"
                    >
                      {title}
                    </h2>

                    {description && (
                      <p
                        id="confirm-dialog-desc"
                        className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="btn btn-secondary btn-md"
                >
                  {cancelLabel}
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={cn(
                    'btn btn-md',
                    cfg.confirmCls,
                    loading && 'btn-loading'
                  )}
                >
                  {!loading && label}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Render into body via portal so z-index stacking is never blocked
  return createPortal(dialog, document.body);
}
