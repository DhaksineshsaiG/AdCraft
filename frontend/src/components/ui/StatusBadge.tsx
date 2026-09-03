import { type ElementType } from 'react';
import { cn } from '../../utils/cn';
import { statusStyles, type StatusVariant } from '../../styles/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BadgeSize   = 'xs' | 'sm' | 'md';
export type BadgeShape  = 'pill' | 'square';

export interface StatusBadgeProps {
  status:       StatusVariant;
  label:        string;
  /** Show a leading coloured dot */
  dot?:         boolean;
  /** Animate the dot with a ping (useful for "live" / "processing" states) */
  pulse?:       boolean;
  /** Optional icon component (lucide-react) — replaces dot when provided */
  icon?:        ElementType;
  size?:        BadgeSize;
  shape?:       BadgeShape;
  className?:   string;
}

// ─── Size maps ─────────────────────────────────────────────────────────────────

const SIZE_CLS: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2   py-0.5 text-xs    gap-1',
  md: 'px-2.5 py-1   text-xs    gap-1.5',
};

const DOT_SIZE: Record<BadgeSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-1.5 w-1.5',
  md: 'h-2   w-2',
};

const ICON_SIZE: Record<BadgeSize, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3   w-3',
  md: 'h-3.5 w-3.5',
};

const SHAPE_CLS: Record<BadgeShape, string> = {
  pill:   'rounded-full',
  square: 'rounded-md',
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export default function StatusBadge({
  status,
  label,
  dot    = true,
  pulse  = false,
  icon:  Icon,
  size   = 'sm',
  shape  = 'pill',
  className,
}: StatusBadgeProps) {
  const styles = statusStyles[status];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border select-none whitespace-nowrap',
        SIZE_CLS[size],
        SHAPE_CLS[shape],
        styles.badge,
        className
      )}
    >
      {/* Leading indicator: icon takes precedence over dot */}
      {Icon ? (
        <Icon
          className={cn(ICON_SIZE[size], styles.iconColor, 'shrink-0')}
          aria-hidden="true"
          strokeWidth={2}
        />
      ) : dot ? (
        <span className="relative inline-flex shrink-0" aria-hidden="true">
          {/* Ping ring */}
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                styles.dotColor
              )}
            />
          )}
          {/* Solid dot */}
          <span
            className={cn(
              'relative inline-flex rounded-full',
              DOT_SIZE[size],
              styles.dotColor
            )}
          />
        </span>
      ) : null}

      {/* Label */}
      <span className="leading-none">{label}</span>
    </span>
  );
}

// ─── Convenience wrappers ──────────────────────────────────────────────────────
// Pre-configured badges for common domain statuses — import directly when
// the status string is known at the call site.

type ConvenienceProps = Omit<StatusBadgeProps, 'status' | 'label'> & { label?: string };

export const SuccessBadge  = (p: ConvenienceProps) => <StatusBadge status="success" label={p.label ?? 'Success'}   {...p} />;
export const WarningBadge  = (p: ConvenienceProps) => <StatusBadge status="warning" label={p.label ?? 'Warning'}   {...p} />;
export const ErrorBadge    = (p: ConvenienceProps) => <StatusBadge status="error"    label={p.label ?? 'Error'}     {...p} />;
export const InfoBadge     = (p: ConvenienceProps) => <StatusBadge status="info"    label={p.label ?? 'Info'}      {...p} />;
export const NeutralBadge  = (p: ConvenienceProps) => <StatusBadge status="neutral" label={p.label ?? 'Neutral'}   {...p} />;
