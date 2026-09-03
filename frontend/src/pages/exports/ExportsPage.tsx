import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  CheckCircle2,
  Loader2,
  AlertCircle,
  LayoutList,
  PackageOpen,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import ExportFilters, { type ExportFilterState } from '../../components/exports/ExportFilters';
import ExportHistory from '../../components/exports/ExportHistory';
import BulkExportDialog, { type BulkExportPoster, type ExportQuality } from '../../components/exports/BulkExportDialog';
import { type ExportFormat } from '../../components/exports/ExportCard';
import { useBulkExport, useExportAnalytics, useExportHistory, useExportSingle } from '../../hooks/useExports';
import { usePosters } from '../../hooks/usePosters';
import { cn } from '../../utils/cn';
import { motionStagger, motionFadeUp } from '../../styles/theme';

const DEFAULT_FILTERS: ExportFilterState = {
  search: '',
  status: 'all',
  format: 'all',
  dateRange: 'all',
};

function withinRange(date: Date, range: ExportFilterState['dateRange']): boolean {
  const now = Date.now();
  if (range === 'all') return true;
  if (range === 'today') return now - date.getTime() < 24 * 3600 * 1000;
  if (range === 'week') return now - date.getTime() < 7 * 24 * 3600 * 1000;
  if (range === 'month') return now - date.getTime() < 30 * 24 * 3600 * 1000;
  return true;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconCls: string;
  loading?: boolean;
  animateIcon?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconCls,
  loading = false,
  animateIcon = false,
}: StatCardProps) {
  return (
    <motion.div
      variants={motionFadeUp}
      className="card p-4 flex items-center gap-4"
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className={cn('h-5 w-5', iconCls, animateIcon && 'animate-spin')} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {loading ? '-' : value}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export default function ExportsPage() {
  const [filters, setFilters] = useState<ExportFilterState>(DEFAULT_FILTERS);
  const [bulkOpen, setBulkOpen] = useState(false);

  const exportHistoryQuery = useExportHistory();
  const exportAnalyticsQuery = useExportAnalytics();
  const postersQuery = usePosters({ generationStatus: 'completed', limit: 100 });
  const exportSingleMutation = useExportSingle();
  const bulkExportMutation = useBulkExport();

  const exports = exportHistoryQuery.data?.records ?? [];
  const analytics = exportAnalyticsQuery.data;

  const bulkPosters = useMemo<BulkExportPoster[]>(() => {
    return (postersQuery.data?.posters ?? [])
      .filter((poster) => poster.generationStatus === 'completed')
      .map((poster) => ({
        id: poster.id,
        name: poster.productName,
        store: poster.storeName,
      }));
  }, [postersQuery.data?.posters]);

  const filtered = useMemo(() => {
    return exports.filter((rec) => {
      const q = filters.search.toLowerCase();
      const matchSearch = !q ||
        rec.posterName.toLowerCase().includes(q) ||
        rec.storeName.toLowerCase().includes(q);
      const matchStatus = filters.status === 'all' || rec.status === filters.status;
      const matchFormat = filters.format === 'all' || rec.format === (filters.format as ExportFormat);
      const matchDate = withinRange(rec.exportedAt, filters.dateRange);
      return matchSearch && matchStatus && matchFormat && matchDate;
    });
  }, [exports, filters]);

  const stats = useMemo(() => ({
    total: analytics?.totalExports ?? exports.length,
    completed: exports.filter((r) => r.status === 'completed').length,
    processing: exports.filter((r) => r.status === 'processing' || r.status === 'queued').length,
    failed: exports.filter((r) => r.status === 'failed').length,
  }), [analytics?.totalExports, exports]);

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function handleDownload(id: string) {
    const rec = exports.find((r) => r.id === id);
    if (!rec) return;
    exportSingleMutation.mutate({ posterId: rec.posterId, format: rec.format });
  }

  function handleRetry(id: string) {
    handleDownload(id);
  }

  async function handleBulkExport(
    posterIds: string[],
    format: ExportFormat,
    quality: ExportQuality
  ) {
    void quality;
    await bulkExportMutation.mutateAsync({ posterIds, format });
  }

  const isStatsLoading = exportAnalyticsQuery.isLoading || exportHistoryQuery.isLoading;

  return (
    <>
      <div className="page-container py-7 space-y-6">
        <PageHeader
          title="Exports"
          subtitle="Download and manage exported posters"
          icon={Download}
          actions={
            <button
              onClick={() => setBulkOpen(true)}
              disabled={postersQuery.isLoading || bulkPosters.length === 0 || bulkExportMutation.isPending}
              className={cn(
                'btn btn-primary btn-md gap-1.5',
                bulkExportMutation.isPending && 'btn-loading',
                (postersQuery.isLoading || bulkPosters.length === 0) && 'opacity-70'
              )}
            >
              {!bulkExportMutation.isPending && <PackageOpen className="h-4 w-4" />}
              {!bulkExportMutation.isPending && 'Bulk export'}
            </button>
          }
        />

        {(exportHistoryQuery.isError || exportAnalyticsQuery.isError || postersQuery.isError) && (
          <ErrorNotice message="Some export data could not be loaded. Available records are shown below." />
        )}

        <motion.div
          variants={motionStagger(0.07)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total Exports"
            value={stats.total}
            icon={LayoutList}
            iconBg="bg-brand-100 dark:bg-brand-900/30"
            iconCls="text-brand-600 dark:text-brand-400"
            loading={isStatsLoading}
          />
          <StatCard
            label="Ready Downloads"
            value={stats.completed}
            icon={CheckCircle2}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconCls="text-emerald-600 dark:text-emerald-400"
            loading={isStatsLoading}
          />
          <StatCard
            label="Processing"
            value={stats.processing}
            icon={Loader2}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconCls="text-blue-600 dark:text-blue-400"
            loading={isStatsLoading}
            animateIcon={isStatsLoading}
          />
          <StatCard
            label="Failed"
            value={stats.failed}
            icon={AlertCircle}
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconCls="text-red-600 dark:text-red-400"
            loading={isStatsLoading}
          />
        </motion.div>

        <motion.div
          variants={motionFadeUp}
          initial="hidden"
          animate="show"
        >
          <ExportFilters
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            totalShown={filtered.length}
            totalRecords={exports.length}
          />
        </motion.div>

        <motion.div
          variants={motionFadeUp}
          initial="hidden"
          animate="show"
        >
          <ExportHistory
            records={filtered}
            isLoading={exportHistoryQuery.isLoading}
            onDownload={handleDownload}
            onRetry={handleRetry}
          />
        </motion.div>
      </div>

      <BulkExportDialog
        open={bulkOpen}
        posters={bulkPosters}
        onClose={() => setBulkOpen(false)}
        onExport={handleBulkExport}
      />
    </>
  );
}
