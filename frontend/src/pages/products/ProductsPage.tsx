import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, RefreshCw, Search, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader  from '../../components/ui/PageHeader';
import EmptyState  from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/LoadingSpinner';
import ProductCard, { type Product } from '../../components/products/ProductCard';
import { cn }     from '../../utils/cn';
import { motionStagger, motionFadeUp } from '../../styles/theme';
import { useProducts, useUpdateProductProcessing } from '../../hooks/useProducts';
import { useStores, useSyncStore } from '../../hooks/useStores';

const ALL_STATUSES = [
  { value: 'all',        label: 'All statuses' },
  { value: 'ready',      label: 'Ready'        },
  { value: 'pending',    label: 'Pending'      },
  { value: 'processing', label: 'Processing'   },
  { value: 'failed',     label: 'Failed'       },
  { value: 'stale',      label: 'Needs resync' },
];

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" aria-label="Loading products">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="card overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-3 p-3.5">
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ Select dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FilterSelect({
  value,
  onChange,
  options,
  className,
}: {
  value:    string;
  onChange: (v: string) => void;
  options:  { value?: string; id?: string; name?: string; label?: string }[];
  className?:string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'input appearance-none pr-8 py-2 text-sm cursor-pointer',
          'bg-white dark:bg-slate-900'
        )}
      >
        {options.map((opt) => {
          const val = opt.value ?? opt.id ?? '';
          const lbl = opt.label ?? opt.name ?? '';
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
        aria-hidden="true"
      />
    </div>
  );
}

// â”€â”€â”€ ProductsPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProductsPage() {
  const [search,       setSearch]       = useState('');
  const [storeFilter,  setStoreFilter]  = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();
  const storesQuery = useStores();
  const syncStoreMutation = useSyncStore();
  const updateProcessingMutation = useUpdateProductProcessing();
  const productsQuery = useProducts({
    search: search.trim().length >= 2 ? search.trim() : undefined,
    storeId: storeFilter === 'all' ? undefined : storeFilter,
    processingStatus: statusFilter === 'all' ? undefined : statusFilter as Product['syncStatus'],
    limit: 100,
  });
  const products = productsQuery.data?.products ?? [];
  const filtered = products;
  const showInitialSkeleton = productsQuery.isLoading && !productsQuery.data;
  const showCountLoading = showInitialSkeleton || productsQuery.isPlaceholderData;
  const totalProducts = productsQuery.data?.pagination.total ?? products.length;
  const storeOptions = [
    { value: 'all', label: 'All stores' },
    ...(storesQuery.data ?? []).map((store) => ({ value: store.id, label: store.name })),
  ];

  // â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const hasActiveFilter = search || storeFilter !== 'all' || statusFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setStoreFilter('all');
    setStatusFilter('all');
  }

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function handleGenerateContent(id: string) {
    navigate(`/posters?productId=${id}`);
  }

  function handleGeneratePoster(id: string) {
    navigate(`/posters?productId=${id}`);
  }

  function handleResync(id: string) {
    updateProcessingMutation.mutate({ productId: id, action: 'markStale' });
  }

  function handleSyncAll() {
    (storesQuery.data ?? [])
      .filter((store) => store.status !== 'syncing')
      .forEach((store) => syncStoreMutation.mutate(store.id));
  }

  return (
    <div className="page-container py-7 space-y-6">
      {/* Header */}
      <PageHeader
        title="Products"
        subtitle="Browse and manage products synced from your connected stores"
        icon={Package}
        actions={
          <button
            onClick={handleSyncAll}
            disabled={syncStoreMutation.isPending || (storesQuery.data ?? []).length === 0}
            className={cn('btn btn-secondary btn-md gap-1.5', syncStoreMutation.isPending && 'btn-loading')}
          >
            {!syncStoreMutation.isPending && <RefreshCw className="h-3.5 w-3.5" />}
            {!syncStoreMutation.isPending && 'Sync all'}
          </button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, categories, vendorsâ€¦"
            className="input pl-9 text-sm"
            aria-label="Search products"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 shrink-0">
          <FilterSelect
            value={storeFilter}
            onChange={setStoreFilter}
            options={storeOptions}
            className="w-44"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={ALL_STATUSES}
            className="w-38"
          />
        </div>
      </div>

      {/* Result meta */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {showCountLoading ? (
            'Loading products...'
          ) : (
            <>
              Showing{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {filtered.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {totalProducts}
              </span>{' '}
              products
            </>
          )}
        </p>

        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="btn btn-ghost btn-sm gap-1 text-brand-600 dark:text-brand-400 text-xs"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Grid / empty state */}
      <AnimatePresence mode="wait">
        {showInitialSkeleton ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ProductGridSkeleton />
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyState
              icon={Package}
              title="No products found"
              description={
                hasActiveFilter
                  ? 'No products match your current filters. Try adjusting the search or filters.'
                  : 'Connect a store and sync products to get started.'
              }
              actions={hasActiveFilter ? [{ label: 'Clear filters', onClick: clearFilters, variant: 'secondary' }] : []}
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={motionStagger(0.04)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {filtered.map((product) => (
              <motion.div key={product.id} variants={motionFadeUp}>
                <ProductCard
                  product={product}
                  onGenerateContent={handleGenerateContent}
                  onGeneratePoster={handleGeneratePoster}
                  onResync={handleResync}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

