import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SettingsSectionProps {
  title:        string;
  description?: string;
  children:     ReactNode;
  className?:   string;
  /** Danger zone styling — red tinted border */
  danger?:      boolean;
}

// ─── SettingsSection ──────────────────────────────────────────────────────────

export default function SettingsSection({
  title,
  description,
  children,
  className,
  danger = false,
}: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
      className={cn(
        'rounded-2xl border bg-white dark:bg-slate-900',
        'shadow-card overflow-hidden',
        danger
          ? 'border-red-200 dark:border-red-900/50'
          : 'border-slate-200 dark:border-slate-800',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-6 py-4 border-b',
          danger
            ? 'border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10'
            : 'border-slate-100 dark:border-slate-800'
        )}
      >
        <h2
          id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className={cn(
            'text-sm font-semibold',
            danger
              ? 'text-red-700 dark:text-red-400'
              : 'text-slate-800 dark:text-slate-100'
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        {children}
      </div>
    </section>
  );
}
