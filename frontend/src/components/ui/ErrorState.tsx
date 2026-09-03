import { type ReactNode, type ElementType } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, WifiOff, ShieldAlert, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ErrorVariant =
  | 'generic'      // Generic unexpected error
  | 'network'      // No connection / timeout
  | 'not-found'    // 404
  | 'forbidden'    // 403
  | 'server'       // 500
  | 'empty';       // Custom "nothing went wrong, just empty" fallthrough

interface ErrorAction {
  label:    string;
  onClick?: () => void;
  href?:    string;
  icon?:    ElementType;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface ErrorStateProps {
  variant?:     ErrorVariant;
  title?:       string;
  message?:     string | ReactNode;
  error?:       Error | unknown;
  /** Show the raw error message in dev mode (auto-detected via import.meta.env.DEV) */
  showRaw?:     boolean;
  actions?:     ErrorAction[];
  onRetry?:     () => void;
  onBack?:      () => void;
  onHome?:      () => void;
  /** 'page' fills the viewport; 'section' is inline inside a container */
  layout?:      'page' | 'section';
  className?:   string;
}

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ErrorVariant, {
  icon:       ElementType;
  iconBg:     string;
  iconColor:  string;
  defaultTitle: string;
  defaultMsg:   string;
}> = {
  generic: {
    icon:         AlertTriangle,
    iconBg:       'bg-amber-100 dark:bg-amber-900/25',
    iconColor:    'text-amber-500',
    defaultTitle: 'Something went wrong',
    defaultMsg:   'An unexpected error occurred. Please try again or contact support if the problem persists.',
  },
  network: {
    icon:         WifiOff,
    iconBg:       'bg-slate-100 dark:bg-slate-800',
    iconColor:    'text-slate-500 dark:text-slate-400',
    defaultTitle: 'Connection problem',
    defaultMsg:   'Unable to reach the server. Check your internet connection and try again.',
  },
  'not-found': {
    icon:         AlertTriangle,
    iconBg:       'bg-blue-100 dark:bg-blue-900/25',
    iconColor:    'text-blue-500',
    defaultTitle: 'Page not found',
    defaultMsg:   'The page you\'re looking for doesn\'t exist or has been moved.',
  },
  forbidden: {
    icon:         ShieldAlert,
    iconBg:       'bg-red-100 dark:bg-red-900/25',
    iconColor:    'text-red-500',
    defaultTitle: 'Access denied',
    defaultMsg:   'You don\'t have permission to view this page.',
  },
  server: {
    icon:         AlertTriangle,
    iconBg:       'bg-red-100 dark:bg-red-900/25',
    iconColor:    'text-red-500',
    defaultTitle: 'Server error',
    defaultMsg:   'Our servers are having trouble. We\'ve been notified and are working on a fix.',
  },
  empty: {
    icon:         AlertTriangle,
    iconBg:       'bg-slate-100 dark:bg-slate-800',
    iconColor:    'text-slate-400',
    defaultTitle: 'Nothing here',
    defaultMsg:   'There\'s nothing to display right now.',
  },
};

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({ action }: { action: ErrorAction }) {
  const Icon    = action.icon;
  const variant = action.variant ?? 'secondary';
  const cls     = cn(
    'btn btn-md inline-flex items-center gap-1.5',
    variant === 'primary'   && 'btn-primary',
    variant === 'secondary' && 'btn-secondary',
    variant === 'ghost'     && 'btn-ghost',
  );

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {action.label}
    </>
  );

  if (action.href) {
    return <a href={action.href} className={cls}>{content}</a>;
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {content}
    </button>
  );
}

// ─── ErrorState ────────────────────────────────────────────────────────────────

export default function ErrorState({
  variant   = 'generic',
  title,
  message,
  error,
  showRaw   = false,
  actions,
  onRetry,
  onBack,
  onHome,
  layout    = 'section',
  className,
}: ErrorStateProps) {
  const cfg          = VARIANT_CONFIG[variant];
  const Icon         = cfg.icon;
  const displayTitle = title   ?? cfg.defaultTitle;
  const displayMsg   = message ?? cfg.defaultMsg;

  // Raw error message for dev debugging
  const rawMessage = showRaw && import.meta.env.DEV && error instanceof Error
    ? error.message
    : null;

  // Build default actions from convenience callbacks
  const resolvedActions: ErrorAction[] = actions ?? [
    ...(onRetry ? [{ label: 'Try again',   onClick: onRetry, icon: RefreshCw, variant: 'primary'   as const }] : []),
    ...(onBack  ? [{ label: 'Go back',     onClick: onBack,  icon: ArrowLeft, variant: 'secondary' as const }] : []),
    ...(onHome  ? [{ label: 'Go to home',  onClick: onHome,  icon: Home,      variant: 'secondary' as const }] : []),
  ];

  const wrapperCls = cn(
    'flex flex-col items-center justify-center text-center',
    layout === 'page'    && 'min-h-[60vh] px-6 py-16',
    layout === 'section' && 'py-12 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50',
    className
  );

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={wrapperCls}
    >
      {/* Icon */}
      <div
        aria-hidden="true"
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl mb-5',
          cfg.iconBg
        )}
      >
        <Icon className={cn('h-7 w-7', cfg.iconColor)} strokeWidth={1.6} />
      </div>

      {/* Title */}
      <p className="text-base font-semibold text-slate-800 dark:text-slate-100 text-balance">
        {displayTitle}
      </p>

      {/* Message */}
      {displayMsg && (
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm text-balance leading-relaxed">
          {displayMsg}
        </div>
      )}

      {/* Raw dev error */}
      {rawMessage && (
        <pre className="mt-3 max-w-sm overflow-auto rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-left text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {rawMessage}
        </pre>
      )}

      {/* Actions */}
      {resolvedActions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {resolvedActions.map((action, i) => (
            <ActionBtn key={i} action={action} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
