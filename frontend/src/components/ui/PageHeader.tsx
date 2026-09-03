import { type ReactNode, type ElementType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@utils/cn';
import type { BreadcrumbItem, BaseProps } from '../../types/common';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PageHeaderProps extends BaseProps {
  title:          string;
  subtitle?:      string | ReactNode;
  breadcrumbs?:   BreadcrumbItem[];
  /** Renders a left-pointing back arrow; navigates to `backHref` or history.back() */
  backHref?:      string;
  showBack?:      boolean;
  /** Icon displayed to the left of the title */
  icon?:          ElementType;
  /** Accent colour for the icon container */
  iconAccent?:    string;
  /** Action buttons / controls rendered on the right */
  actions?:       ReactNode;
  /** Additional content below the title row (tabs, filters, etc.) */
  children?:      ReactNode;
  /** Remove bottom border and margin — use when the header is inside a card */
  borderless?:    boolean;
  /** Compact variant reduces vertical padding */
  compact?:       boolean;
}

// ─── Breadcrumbs sub-component ────────────────────────────────────────────────

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    'text-xs font-medium',
                    isLast
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── PageHeader ────────────────────────────────────────────────────────────────

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  backHref,
  showBack    = false,
  icon:  Icon,
  iconAccent  = 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
  actions,
  children,
  borderless  = false,
  compact     = false,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  function handleBack() {
    if (backHref) navigate(backHref);
    else navigate(-1);
  }

  const hasBack = showBack || !!backHref;

  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'w-full',
        compact ? 'pb-4' : 'pb-6',
        !borderless && 'border-b border-slate-200 dark:border-slate-800 mb-6',
        className
      )}
    >
      {/* Back button + breadcrumbs */}
      {(hasBack || breadcrumbs) && (
        <div className="flex items-center gap-3 mb-3">
          {hasBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className={cn(
                'btn btn-ghost btn-icon-sm shrink-0 -ml-1',
                'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">

        {/* Left: icon + title + subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={cn(
                'flex shrink-0 items-center justify-center h-10 w-10 rounded-xl',
                iconAccent
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </div>
          )}

          <div className="min-w-0">
            <h1 className={cn(
              'font-bold tracking-tight text-slate-900 dark:text-white truncate',
              compact ? 'text-xl' : 'text-2xl'
            )}>
              {title}
            </h1>

            {subtitle && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 text-balance">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: action slot */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Optional children slot (tabs, filters, segmented control, etc.) */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </motion.header>
  );
}
