import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Download, Image as ImageIcon, Package, Plus, RefreshCw, Sparkles, Store as StoreIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardStats, { type DashboardStat } from '@components/dashboard/DashboardStats';
import RecentActivity, { type Activity } from '@components/dashboard/RecentActivity';
import { useAuth }     from '@hooks/useAuth';
import { useContentHistory } from '@hooks/useGeneratedContent';
import { useExportAnalytics, useExportHistory } from '@hooks/useExports';
import { usePosters } from '@hooks/usePosters';
import { useProductAnalytics } from '@hooks/useProducts';
import { useStores, useSyncStore } from '@hooks/useStores';
import { cn } from '../../utils/cn';

// ─── Animation config ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

const staggerContainer = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

const PRO_UI_ENABLED = false;

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  description,
  href,
  accent,
  disabled = false,
  disabledReason,
}: {
  icon:        React.ElementType;
  label:       string;
  description: string;
  href:        string;
  accent:      string;
  disabled?:   boolean;
  disabledReason?: string;
}) {
  const content = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent} transition-transform duration-200 group-hover:scale-110`}>
        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-500" />
    </>
  );

  return (
    <motion.div variants={fadeUp}>
      {disabled ? (
        <div
          className={cn('card flex items-start gap-3 p-4 opacity-55 cursor-not-allowed group')}
          aria-disabled="true"
          title={disabledReason}
        >
          {content}
        </div>
      ) : (
        <Link
          to={href}
          className="card-hover flex items-start gap-3 p-4 group"
        >
          {content}
        </Link>
      )}
    </motion.div>
  );
}

// ─── Greeting helper ──────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const storesQuery = useStores();
  const productAnalyticsQuery = useProductAnalytics();
  const postersQuery = usePosters({ limit: 100 });
  const exportAnalyticsQuery = useExportAnalytics();
  const exportsQuery = useExportHistory({ limit: 100 });
  const contentHistoryQuery = useContentHistory(undefined, { limit: 100 });
  const syncStoreMutation = useSyncStore();

  const stores = storesQuery.data ?? [];
  const hasConnectedStore = stores.some((store) => store.status !== 'disconnected');
  const productAnalytics = productAnalyticsQuery.data;
  const posters = postersQuery.data?.posters ?? [];
  const exportAnalytics = exportAnalyticsQuery.data;
  const exportRecords = exportsQuery.data?.records ?? [];
  const contentRecords = contentHistoryQuery.data?.records ?? [];

  const stats = useMemo<DashboardStat[]>(() => [
    {
      label: 'Connected Stores',
      value: stores.length,
      delta: stores.filter((store) => store.status === 'active').length,
      deltaLabel: 'active',
      icon: StoreIcon,
      iconBg: 'bg-brand-100 dark:bg-brand-900/30',
      iconColor: 'text-brand-600 dark:text-brand-400',
      href: '/stores',
    },
    {
      label: 'Total Products',
      value: (productAnalytics?.totalProducts ?? 0).toLocaleString(),
      delta: productAnalytics?.recentlySynced ?? 0,
      deltaLabel: 'synced today',
      icon: Package,
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: 'text-violet-600 dark:text-violet-400',
      href: '/products',
    },
    {
      label: 'Generated Posters',
      value: postersQuery.data?.pagination.total ?? posters.length,
      delta: posters.filter((poster) => poster.generationStatus === 'completed').length,
      deltaLabel: 'ready',
      icon: ImageIcon,
      iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      href: '/posters',
    },
    {
      label: 'Total Exports',
      value: (exportAnalytics?.totalExports ?? 0).toLocaleString(),
      delta: exportAnalytics?.exportsLast7Days ?? 0,
      deltaLabel: 'last 7 days',
      icon: Download,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      href: '/exports',
    },
  ], [exportAnalytics, posters, postersQuery.data?.pagination.total, productAnalytics, stores]);

  const activities = useMemo<Activity[]>(() => {
    const storeActivities = stores
      .filter((store) => store.lastSyncAt)
      .map<Activity>((store) => ({
        id: `store-${store.id}-${store.lastSyncAt!.toISOString()}`,
        type: store.status === 'error' ? 'sync_failed' : 'sync_complete',
        title: store.status === 'error' ? 'Store sync failed' : 'Product sync complete',
        description: `${store.totalProducts.toLocaleString()} products synced from ${store.name}`,
        timestamp: store.lastSyncAt!,
        status: store.status === 'error' ? 'error' : 'success',
        meta: 'Stores',
      }));

    const posterActivities = posters.map<Activity>((poster) => ({
      id: `poster-${poster.id}`,
      type: poster.generationStatus === 'failed' ? 'poster_failed' : 'poster_generated',
      title: poster.generationStatus === 'failed' ? 'Poster generation failed' : 'Poster generated',
      description: `${poster.productName} - ${poster.style} style, ${poster.size.replace('_', ' ')} format`,
      timestamp: poster.createdAt,
      status: poster.generationStatus === 'failed' ? 'error' : 'success',
      meta: 'Posters',
    }));

    const contentActivities = contentRecords.map<Activity>((record) => ({
      id: `content-${record._id}`,
      type: 'content_generated',
      title: 'AI content generated',
      description: `${record.contentType.replace(/_/g, ' ')} generated`,
      timestamp: record.createdAt ? new Date(record.createdAt) : new Date(),
      status: record.status === 'failed' ? 'error' : 'success',
      meta: 'Content',
    }));

    const downloadActivities = exportRecords.map<Activity>((record) => ({
      id: `export-${record.id}`,
      type: 'export_downloaded',
      title: 'Poster exported',
      description: `${record.posterName} exported as ${record.format.toUpperCase()}`,
      timestamp: record.exportedAt,
      status: 'info',
      meta: 'Exports',
    }));

    return [...storeActivities, ...posterActivities, ...contentActivities, ...downloadActivities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [contentRecords, exportRecords, posters, stores]);

  const isDashboardLoading =
    storesQuery.isLoading ||
    productAnalyticsQuery.isLoading ||
    productAnalyticsQuery.isFetching ||
    postersQuery.isLoading ||
    exportAnalyticsQuery.isLoading ||
    exportsQuery.isLoading ||
    contentHistoryQuery.isLoading;

  function handleSyncStores() {
    stores
      .filter((store) => store.status !== 'syncing')
      .forEach((store) => syncStoreMutation.mutate(store.id));
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="page-container py-7 space-y-7"
    >
      {/* ── Welcome header ──────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          {/* Greeting pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50 mb-3">
            <span className="text-lg leading-none">👋</span>
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
              {greeting()}
            </span>
          </div>

          <h1 className="page-title">
            Welcome back,{' '}
            <span className="text-gradient-brand">{firstName}</span>
          </h1>
          <p className="page-description mt-1">
            Here's what's happening with your stores today.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSyncStores}
            disabled={syncStoreMutation.isPending || stores.length === 0}
            className={`btn btn-secondary btn-sm gap-1.5 ${syncStoreMutation.isPending ? 'btn-loading' : ''}`}
          >
            {!syncStoreMutation.isPending && <RefreshCw className="h-3.5 w-3.5" />}
            {!syncStoreMutation.isPending && 'Sync stores'}
          </button>
          <Link to="/posters" className="btn btn-primary btn-sm gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New poster
          </Link>
        </div>
      </motion.div>

      {/* ── Stats grid ──────────────────────────────────────────────────── */}
      <motion.section variants={fadeUp} aria-label="Overview statistics">
        <DashboardStats stats={stats} isLoading={isDashboardLoading} />
      </motion.section>

      {/* ── Main content grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Activity feed — takes 2/3 on xl */}
        <motion.section
          variants={fadeUp}
          className="xl:col-span-2"
          aria-label="Recent activity"
        >
          <RecentActivity activities={activities} isLoading={isDashboardLoading} />
        </motion.section>

        {/* Quick actions — takes 1/3 on xl */}
        <motion.section variants={fadeUp} aria-label="Quick actions">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Quick Actions
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Jump to common tasks
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="p-3 space-y-1"
            >
              <QuickAction
                icon={Plus}
                label="Connect a store"
                description="Add Shopify or WooCommerce"
                href="/stores"
                accent="bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
              />
              <QuickAction
                icon={RefreshCw}
                label="Sync products"
                description="Import latest product data"
                href="/stores"
                accent="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
              />
              <QuickAction
                icon={Plus}
                label="Generate poster"
                description="Create a product poster"
                href="/posters"
                accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                disabled={!hasConnectedStore}
                disabledReason="Connect a store before generating posters."
              />
            </motion.div>
          </div>

          {PRO_UI_ENABLED && (
            <motion.div
              variants={fadeUp}
              className="mt-4 relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600"
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 mb-3">
                  <Sparkles className="h-4.5 w-4.5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">Unlock Pro</h3>
                <p className="text-xs text-white/70 mt-1 mb-4">
                  Unlimited posters, bulk exports, priority AI generation and more.
                </p>
                <button className="btn btn-sm w-full gap-1.5 bg-white text-brand-700 hover:bg-white/90 border-transparent font-semibold shadow-md">
                  Upgrade now
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
