import { cn } from '@utils/cn';
import type { Size } from '../../types/common';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?:      Size;
  className?: string;
  /** Accessible label read by screen readers. Defaults to "Loading…" */
  label?:     string;
  /** Colour variant */
  variant?:   'brand' | 'white' | 'slate' | 'current';
}

interface LoadingOverlayProps {
  /** Show as an absolute overlay over the parent (parent must be relative/absolute) */
  overlay?:    boolean;
  size?:       Size;
  label?:      string;
  className?:  string;
  /** Optional backdrop blur on the overlay */
  blur?:       boolean;
}

interface SkeletonProps {
  className?: string;
  /** Pulse animation speed */
  speed?:     'slow' | 'normal' | 'fast';
}

// ─── Size maps ─────────────────────────────────────────────────────────────────

const TRACK_SIZE: Record<Size, string> = {
  xs: 'h-3.5 w-3.5 border-[1.5px]',
  sm: 'h-4.5 w-4.5 border-2',
  md: 'h-6   w-6   border-2',
  lg: 'h-8   w-8   border-[2.5px]',
  xl: 'h-11  w-11  border-[3px]',
};

const TRACK_COLOR: Record<NonNullable<SpinnerProps['variant']>, string> = {
  brand:   'border-brand-200 border-t-brand-500',
  white:   'border-white/30  border-t-white',
  slate:   'border-slate-200 dark:border-slate-700 border-t-slate-500 dark:border-t-slate-400',
  current: 'border-current/20 border-t-current',
};

// ─── LoadingSpinner ────────────────────────────────────────────────────────────

/**
 * Accessible spinning loader.
 *
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" variant="white" label="Generating poster…" />
 */
export function LoadingSpinner({
  size    = 'md',
  variant = 'brand',
  label   = 'Loading…',
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center shrink-0', className)}
    >
      <span
        className={cn(
          'block rounded-full animate-spin',
          TRACK_SIZE[size],
          TRACK_COLOR[variant]
        )}
        aria-hidden="true"
      />
      {/* Visually hidden text for screen readers */}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function AppLoadingIcon({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="relative grid h-20 w-20 place-items-center">
      <div className="absolute inset-0 animate-spin rounded-[1.75rem]">
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-brand-300 shadow-[0_0_16px_rgba(165,180,252,0.8)]" />
      </div>
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-lg">
        <div className="h-4 w-4 rounded-md bg-white/85" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── LoadingDots ───────────────────────────────────────────────────────────────

/**
 * Three bouncing dots — lighter alternative to a spinner.
 *
 * @example
 * <LoadingDots />
 * <LoadingDots size="sm" variant="white" />
 */
export function LoadingDots({
  size    = 'md',
  variant = 'brand',
  label   = 'Loading…',
  className,
}: SpinnerProps) {
  const dotSize: Record<Size, string> = {
    xs: 'h-1   w-1',
    sm: 'h-1.5 w-1.5',
    md: 'h-2   w-2',
    lg: 'h-2.5 w-2.5',
    xl: 'h-3   w-3',
  };

  const dotColor: Record<NonNullable<SpinnerProps['variant']>, string> = {
    brand:   'bg-brand-500',
    white:   'bg-white',
    slate:   'bg-slate-500 dark:bg-slate-400',
    current: 'bg-current',
  };

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'rounded-full animate-pulse-soft',
            dotSize[size],
            dotColor[variant]
          )}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}

// ─── LoadingOverlay ────────────────────────────────────────────────────────────

/**
 * Full-container loading overlay. Place inside a `relative` parent.
 *
 * @example
 * <div className="relative min-h-[200px]">
 *   <LoadingOverlay overlay label="Generating…" />
 * </div>
 */
export function LoadingOverlay({
  overlay   = true,
  size      = 'md',
  label     = 'Loading…',
  blur      = false,
  className,
}: LoadingOverlayProps) {
  if (!overlay) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size={size} />
          {label && (
            <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
              {label}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3',
        'rounded-[inherit]',
        blur
          ? 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm'
          : 'bg-white/60 dark:bg-slate-900/60',
        className
      )}
    >
      <LoadingSpinner size={size} />
      {label && (
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </p>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

/**
 * Shimmer skeleton block. Shape via `className` (width, height, border-radius).
 *
 * @example
 * <Skeleton className="h-4 w-32 rounded" />
 * <Skeleton className="h-10 w-full rounded-xl" />
 */
export function Skeleton({ className, speed = 'normal' }: SkeletonProps) {
  const animation: Record<NonNullable<SkeletonProps['speed']>, string> = {
    slow:   'animate-[pulse_2.5s_ease-in-out_infinite]',
    normal: 'animate-pulse',
    fast:   'animate-[pulse_1s_ease-in-out_infinite]',
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-slate-200 dark:bg-slate-700/60',
        animation[speed],
        className
      )}
    />
  );
}

// ─── SkeletonText ──────────────────────────────────────────────────────────────

/**
 * Multi-line text skeleton block.
 *
 * @example
 * <SkeletonText lines={3} />
 */
export function SkeletonText({
  lines     = 3,
  className,
}: {
  lines?:    number;
  className?: string;
}) {
  // Each line gets a slightly different width to look natural
  const widths = [
    'w-full', 'w-11/12', 'w-4/5', 'w-3/4',
    'w-full', 'w-5/6', 'w-11/12', 'w-2/3',
  ];

  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4 rounded', widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

// ─── Default export ────────────────────────────────────────────────────────────

export default LoadingSpinner;
