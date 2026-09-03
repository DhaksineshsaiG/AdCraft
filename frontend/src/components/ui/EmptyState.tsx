import { type ElementType, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { cn } from '@utils/cn';
import type { BaseProps, Size } from '../../types/common';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActionItem {
  label:     string;
  onClick?:  () => void;
  href?:     string;
  /** 'primary' renders as brand-filled button; 'secondary' is outlined */
  variant?:  'primary' | 'secondary';
  icon?:     ElementType;
}

export interface EmptyStateProps extends BaseProps {
  /** Icon component (from lucide-react or any SVG component). Defaults to Inbox. */
  icon?:        ElementType;
  /** Custom icon node — takes precedence over `icon` */
  iconNode?:    ReactNode;
  /** Controls the icon container size */
  iconSize?:    Size;
  title:        string;
  description?: string | ReactNode;
  actions?:     ActionItem[];
  /** 'default' | 'subtle' (no border) | 'dashed' */
  variant?:     'default' | 'subtle' | 'dashed';
  /** Reduce padding — useful inside cards that already have padding */
  compact?:     boolean;
}

// ─── Size maps ────────────────────────────────────────────────────────────────

const ICON_CONTAINER: Record<Size, string> = {
  xs: 'h-8  w-8',
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
};

const ICON_INNER: Record<Size, string> = {
  xs: 'h-4   w-4',
  sm: 'h-5   w-5',
  md: 'h-6   w-6',
  lg: 'h-8   w-8',
  xl: 'h-10  w-10',
};

const CONTAINER_RADIUS: Record<Size, string> = {
  xs: 'rounded-lg',
  sm: 'rounded-xl',
  md: 'rounded-2xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
};

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionButton({ action }: { action: ActionItem }) {
  const Icon     = action.icon;
  const variant  = action.variant ?? 'primary';
  const sharedCn = 'btn btn-md inline-flex items-center gap-1.5';

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <a
        href={action.href}
        className={cn(sharedCn, variant === 'primary' ? 'btn-primary' : 'btn-secondary')}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(sharedCn, variant === 'primary' ? 'btn-primary' : 'btn-secondary')}
    >
      {content}
    </button>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────────

export default function EmptyState({
  icon:        IconProp = Inbox,
  iconNode,
  iconSize     = 'md',
  title,
  description,
  actions,
  variant      = 'default',
  compact      = false,
  className,
}: EmptyStateProps) {
  const containerClass = cn(
    'flex flex-col items-center justify-center text-center',
    compact ? 'py-8 px-4' : 'py-14 px-6',
    variant === 'default' && 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50',
    variant === 'dashed'  && 'rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700',
    // 'subtle' has no border — inherits parent background
    className
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={containerClass}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center mb-4',
          'bg-slate-100 dark:bg-slate-800',
          ICON_CONTAINER[iconSize],
          CONTAINER_RADIUS[iconSize]
        )}
        aria-hidden="true"
      >
        {iconNode ?? (
          <IconProp
            className={cn(ICON_INNER[iconSize], 'text-slate-400 dark:text-slate-500')}
            strokeWidth={1.5}
          />
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-balance">
        {title}
      </p>

      {/* Description */}
      {description && (
        <div className={cn(
          'mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-xs text-balance',
          typeof description === 'string' ? '' : ''
        )}>
          {description}
        </div>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className={cn(
          'mt-5 flex flex-wrap items-center justify-center gap-2',
        )}>
          {actions.map((action, i) => (
            <ActionButton key={i} action={action} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
