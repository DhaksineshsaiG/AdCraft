//import { type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Slash, Home } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { BreadcrumbItem } from '../../types/common';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BreadcrumbSeparator = 'chevron' | 'slash' | 'dot';

export interface BreadcrumbsProps {
  items:          BreadcrumbItem[];
  separator?:     BreadcrumbSeparator;
  /** Show a home icon as the first item */
  showHomeIcon?:  boolean;
  /** Collapse to "… / Parent / Current" when items exceed this count (0 = never) */
  maxVisible?:    number;
  size?:          'sm' | 'md';
  className?:     string;
}

// ─── Separator icon ───────────────────────────────────────────────────────────

function Separator({ type, size }: { type: BreadcrumbSeparator; size: 'sm' | 'md' }) {
  const cls = cn(
    'shrink-0 text-slate-300 dark:text-slate-600',
    size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  );

  if (type === 'chevron') return <ChevronRight className={cls} aria-hidden="true" />;
  if (type === 'slash')   return <Slash        className={cls} aria-hidden="true" />;

  // dot
  return (
    <span
      className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"
      aria-hidden="true"
    />
  );
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

export default function Breadcrumbs({
  items,
  separator    = 'chevron',
  showHomeIcon = false,
  maxVisible   = 0,
  size         = 'sm',
  className,
}: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  // Compute visible items with optional truncation
  let visibleItems = items;
  let truncated    = false;

  if (maxVisible > 0 && items.length > maxVisible) {
    truncated    = true;
    // Always show first + last (maxVisible - 1) items, with ellipsis in between
    const tail   = items.slice(-(maxVisible - 1));
    visibleItems = [items[0]!, ...tail];
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-1">

        {/* Optional home icon prefix */}
        {showHomeIcon && (
          <>
            <li>
              <Link
                to="/"
                aria-label="Home"
                className={cn(
                  'flex items-center text-slate-400 dark:text-slate-500',
                  'hover:text-brand-600 dark:hover:text-brand-400 transition-colors'
                )}
              >
                <Home
                  className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
                  aria-hidden="true"
                />
              </Link>
            </li>
            <li aria-hidden="true">
              <Separator type={separator} size={size} />
            </li>
          </>
        )}

        {visibleItems.map((item, index) => {
          const isLast     = index === visibleItems.length - 1;
          // Insert ellipsis placeholder after the first item when truncated
          const showEllipsis = truncated && index === 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {/* Separator before every item except the first (and after home icon) */}
              {index > 0 && !showHomeIcon && (
                <Separator type={separator} size={size} />
              )}
              {index > 0 && showHomeIcon && (
                <Separator type={separator} size={size} />
              )}

              {showEllipsis && (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(textSize, 'font-medium text-slate-400 dark:text-slate-500 select-none')}
                  >
                    …
                  </span>
                  <Separator type={separator} size={size} />
                </>
              )}

              {/* Item */}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn(
                    textSize,
                    'font-medium max-w-[160px] truncate',
                    isLast
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className={cn(
                    textSize,
                    'font-medium max-w-[160px] truncate',
                    'text-slate-400 dark:text-slate-500',
                    'hover:text-brand-600 dark:hover:text-brand-400 transition-colors'
                  )}
                  title={item.label}
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
