import { ChevronDown, Search, X } from 'lucide-react';
import { cn }           from '../../utils/cn';
import { Skeleton }     from '../ui/LoadingSpinner';
import type { ExportStatus, ExportFormat } from './ExportCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ExportFilterState {
  search:    string;
  status:    ExportStatus | 'all';
  format:    ExportFormat | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

interface ExportFiltersProps {
  filters:       ExportFilterState;
  onChange:      (next: ExportFilterState) => void;
  onClear:       () => void;
  totalShown:    number;
  totalRecords:  number;
  isLoading?:    boolean;
  className?:    string;
}

// ─── Options ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: ExportFilterState['status']; label: string }> = [
  { value: 'all',        label: 'All statuses' },
  { value: 'completed',  label: 'Ready'        },
  { value: 'processing', label: 'Processing'   },
  { value: 'queued',     label: 'Queued'       },
  { value: 'failed',     label: 'Failed'       },
];

const FORMAT_OPTIONS: Array<{ value: ExportFilterState['format']; label: string }> = [
  { value: 'all',  label: 'All formats' },
  { value: 'jpeg', label: 'JPEG'        },
  { value: 'png',  label: 'PNG'         },
  { value: 'webp', label: 'WEBP'        },
  { value: 'pdf',  label: 'PDF'         },
];

const DATE_OPTIONS: Array<{ value: ExportFilterState['dateRange']; label: string }> = [
  { value: 'all',   label: 'Any time'    },
  { value: 'today', label: 'Today'       },
  { value: 'week',  label: 'This week'   },
  { value: 'month', label: 'This month'  },
];

// ─── Select helper ────────────────────────────────────────────────────────────

function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value:     T;
  onChange:  (v: T) => void;
  options:   Array<{ value: T; label: string }>;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value as T)}
        className="input appearance-none pr-8 py-2 text-sm cursor-pointer bg-white dark:bg-slate-900"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
        aria-hidden="true"
      />
    </div>
  );
}

// ─── ExportFilters ────────────────────────────────────────────────────────────

export default function ExportFilters({
  filters,
  onChange,
  onClear,
  totalShown,
  totalRecords,
  isLoading,
  className,
}: ExportFiltersProps) {
  const hasActiveFilter =
    filters.search        !== ''    ||
    filters.status        !== 'all' ||
    filters.format        !== 'all' ||
    filters.dateRange     !== 'all';

  function set<K extends keyof ExportFilterState>(key: K, value: ExportFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Row 1: search + selects */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search poster names or stores…"
            className="input pl-9 text-sm"
            aria-label="Search exports"
          />
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Select<ExportFilterState['status']>
            value={filters.status}
            onChange={(v) => set('status', v)}
            options={STATUS_OPTIONS}
            className="w-36"
            ariaLabel="Filter by status"
          />
          <Select<ExportFilterState['format']>
            value={filters.format}
            onChange={(v) => set('format', v)}
            options={FORMAT_OPTIONS}
            className="w-32"
            ariaLabel="Filter by format"
          />
          <Select<ExportFilterState['dateRange']>
            value={filters.dateRange}
            onChange={(v) => set('dateRange', v)}
            options={DATE_OPTIONS}
            className="w-32"
            ariaLabel="Filter by date"
          />
        </div>
      </div>

      {/* Row 2: result count + clear */}
      <div className="flex items-center justify-between">
        {isLoading ? (
          <Skeleton className="h-4 w-36 rounded my-0.5" />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalShown}</span>
            {' '}of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalRecords}</span>
            {' '}exports
          </p>
        )}

        {hasActiveFilter && (
          <button
            onClick={onClear}
            className="btn btn-ghost btn-sm gap-1 text-brand-600 dark:text-brand-400 text-xs"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
