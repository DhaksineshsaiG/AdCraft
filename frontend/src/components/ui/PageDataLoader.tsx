import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface PageDataLoaderProps {
  /** Main message displayed below the logo */
  message?: string;
  /** Secondary subtitle / hint */
  description?: string;
  /** Optional container height / class override */
  className?: string;
  /** Whether to occupy min-h-[400px] or full parent height */
  compact?: boolean;
}

export default function PageDataLoader({
  message = 'Loading data…',
  description = 'Preparing your workspace',
  className,
  compact = false,
}: PageDataLoaderProps) {
  return (
    <div
      role="status"
      aria-label={message}
      className={cn(
        'flex w-full flex-col items-center justify-center p-8 text-center select-none',
        compact ? 'min-h-[260px]' : 'min-h-[420px]',
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-center max-w-sm"
      >
        {/* Brand Icon with Ambient Glow and Orbiting Track */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
          {/* Subtle orbiting spinner track */}
          <div
            className="absolute inset-0 rounded-full border-[1.5px] border-brand-500/20 border-t-brand-500 dark:border-brand-400/25 dark:border-t-brand-400 animate-spin"
            style={{ animationDuration: '2.5s' }}
          />

          {/* Logo with dark mode ambient glow wrapper */}
          <div className="brand-logo-wrapper brand-logo-glow-loader z-10">
            <img
              src="/brand/adcraft-icon.png"
              alt="AdCraft"
              className="brand-logo h-11 w-11 object-contain"
            />
          </div>
        </div>

        {/* Primary Loading Text */}
        <h3 className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {message}
        </h3>

        {/* Secondary Description */}
        {description && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}

        {/* Indeterminate micro progress bar */}
        <div className="mt-5 h-1 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-brand-500 to-violet-500 animate-[shimmer_1.6s_ease-in-out_infinite]" />
        </div>
      </motion.div>
    </div>
  );
}
