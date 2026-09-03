import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type GenerationPhase =
  | 'idle'
  | 'generating-content'
  | 'composing-image'
  | 'uploading'
  | 'completed'
  | 'failed';

export interface GenerationProgressProps {
  phase:        GenerationPhase;
  productName?: string;
  errorMessage?:string;
  /** 0–100 override; auto-advances if not provided */
  progress?:    number;
  onDismiss?:   () => void;
  onRetry?:     () => void;
  className?:   string;
}

// ─── Step config ──────────────────────────────────────────────────────────────

interface Step {
  id:       GenerationPhase;
  label:    string;
  sublabel: string;
  icon:     React.ElementType;
}

const STEPS: Step[] = [
  { id: 'generating-content', label: 'Generating content',  sublabel: 'AI writing headlines & copy', icon: Sparkles   },
  { id: 'composing-image',    label: 'Composing poster',    sublabel: 'Applying template & layout',  icon: ImageIcon  },
  { id: 'uploading',          label: 'Saving to cloud',     sublabel: 'Uploading to storage',        icon: Upload     },
  { id: 'completed',          label: 'Poster ready',        sublabel: 'Generation complete',         icon: CheckCircle2},
];

const PHASE_ORDER: GenerationPhase[] = [
  'idle',
  'generating-content',
  'composing-image',
  'uploading',
  'completed',
];

function phaseIndex(phase: GenerationPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

// ─── Animated number counter ──────────────────────────────────────────────────

function useAutoProgress(phase: GenerationPhase, externalProgress?: number): number {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (externalProgress !== undefined) { setPct(externalProgress); return; }

    const targets: Partial<Record<GenerationPhase, number>> = {
      'idle':               0,
      'generating-content': 33,
      'composing-image':    66,
      'uploading':          90,
      'completed':          100,
      'failed':             pct, // freeze
    };
    const target = targets[phase] ?? 0;

    if (phase === 'failed') return;

    const interval = setInterval(() => {
      setPct((prev) => {
        if (prev >= target) { clearInterval(interval); return prev; }
        return Math.min(prev + 1, target);
      });
    }, 16);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, externalProgress]);

  return pct;
}

// ─── GenerationProgress ───────────────────────────────────────────────────────

export default function GenerationProgress({
  phase,
  productName,
  errorMessage,
  progress: externalProgress,
  onDismiss,
  onRetry,
  className,
}: GenerationProgressProps) {
  const pct       = useAutoProgress(phase, externalProgress);
  const isFailed  = phase === 'failed';
  const isDone    = phase === 'completed';
  //const isActive  = !isFailed && !isDone && phase !== 'idle';
  const currentStep = phaseIndex(phase);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{ opacity: 0, y: -10  }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden',
        isFailed
          ? 'border-red-200 dark:border-red-900/50'
          : isDone
          ? 'border-emerald-200 dark:border-emerald-900/50'
          : 'border-slate-200 dark:border-slate-800',
        'shadow-card',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-5 py-4 border-b',
        isFailed
          ? 'border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10'
          : isDone
          ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10'
          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
      )}>
        <div className="flex items-center gap-2.5">
          {isFailed ? (
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
          ) : isDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <Loader2 className="h-5 w-5 text-brand-500 shrink-0 animate-spin" />
          )}
          <div className="min-w-0">
            <p className={cn(
              'text-sm font-semibold',
              isFailed ? 'text-red-700 dark:text-red-400'
              : isDone  ? 'text-emerald-700 dark:text-emerald-400'
              :           'text-slate-800 dark:text-slate-100'
            )}>
              {isFailed ? 'Generation failed'
               : isDone  ? 'Poster generated!'
               :           'Generating poster…'}
            </p>
            {productName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {productName}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Progress bar */}
        {!isFailed && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Progress</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  isDone ? 'bg-emerald-500' : 'bg-brand-500'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Step tracker */}
        <div className="space-y-2">
          {STEPS.map((step) => {
            const stepPhaseIdx = phaseIndex(step.id);
            const isDoneStep   = stepPhaseIdx < currentStep || isDone;
            const isCurrentStep= step.id === phase && !isDone && !isFailed;
            const isPending    = stepPhaseIdx > currentStep && !isDone;
            const Icon         = step.icon;

            return (
              <div key={step.id} className="flex items-center gap-3">
                {/* Step icon */}
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
                  isDoneStep   ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : isCurrentStep ? 'bg-brand-100 dark:bg-brand-900/30'
                  :                 'bg-slate-100 dark:bg-slate-800'
                )}>
                  {isDoneStep ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrentStep ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    >
                      <Loader2 className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                    </motion.div>
                  ) : (
                    <Icon className={cn(
                      'h-3.5 w-3.5',
                      isPending ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'
                    )} strokeWidth={1.8} />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium transition-colors',
                    isDoneStep   ? 'text-emerald-700 dark:text-emerald-400'
                    : isCurrentStep ? 'text-brand-700 dark:text-brand-400'
                    :                 'text-slate-400 dark:text-slate-600'
                  )}>
                    {step.label}
                  </p>
                  {isCurrentStep && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-slate-400 dark:text-slate-500 mt-0.5"
                    >
                      {step.sublabel}
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {isFailed && errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/15 rounded-lg px-3 py-2 border border-red-100 dark:border-red-900/40">
            {errorMessage}
          </p>
        )}

        {/* Action buttons */}
        {(isFailed || isDone) && (
          <div className="flex items-center gap-2 pt-1">
            {isFailed && onRetry && (
              <button onClick={onRetry} className="btn btn-primary btn-sm flex-1 gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Try again
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className="btn btn-secondary btn-sm flex-1">
                {isDone ? 'View poster' : 'Dismiss'}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
