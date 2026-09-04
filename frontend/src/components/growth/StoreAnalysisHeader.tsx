import React, { useEffect, useState } from 'react';
import { Sparkles, Store as StoreIcon, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { Store } from '../stores/StoreCard';
import { cn } from '../../utils/cn';

interface StoreAnalysisHeaderProps {
  stores: Store[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  lastAnalyzedAt?: string;
}

const ANALYSIS_STEPS = [
  'Evaluating pricing & margin signals...',
  'Checking variant & inventory readiness...',
  'Reviewing product visual assets & copy...',
  'Synthesizing top growth recommendations...',
];

export const StoreAnalysisHeader: React.FC<StoreAnalysisHeaderProps> = ({
  stores,
  selectedStoreId,
  onSelectStore,
  onAnalyze,
  isAnalyzing,
  lastAnalyzedAt,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Progressive feedback timer when analyzing
  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 750);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm mb-8 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Title and Agent Identity */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
            <span>AI Growth Brain · Track 01</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            AI Growth Command Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Your autonomous agent analyzes catalog pricing, stock depth, and readiness to detect high-leverage marketing opportunities.
          </p>
        </div>

        {/* Controls: Store Selector & Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          {stores.length > 0 && (
            <div className="relative min-w-[200px]">
              <select
                value={selectedStoreId}
                onChange={(e) => onSelectStore(e.target.value)}
                disabled={isAnalyzing}
                className="w-full appearance-none pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-60"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.platform})
                  </option>
                ))}
              </select>
              <StoreIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing || !selectedStoreId}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md',
              'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-brand-500/25',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Catalog...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-brand-200" />
                <span>Analyze My Store</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progressive Step Progress Indicator when analyzing */}
      {isAnalyzing && (
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-brand-600 dark:text-brand-400">
                Agentic Catalog Inspection
              </span>
              <span>Step {currentStepIndex + 1} of {ANALYSIS_STEPS.length}</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>
            {/* Active message */}
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 mt-1">
              <Loader2 className="w-3 h-3 animate-spin text-brand-500 shrink-0" />
              <span>{ANALYSIS_STEPS[currentStepIndex]}</span>
            </p>
          </div>
        </div>
      )}

      {/* Last analyzed note */}
      {!isAnalyzing && lastAnalyzedAt && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Catalog analyzed: {new Date(lastAnalyzedAt).toLocaleTimeString()} ({selectedStore?.name})</span>
        </div>
      )}
    </div>
  );
};

export default StoreAnalysisHeader;
