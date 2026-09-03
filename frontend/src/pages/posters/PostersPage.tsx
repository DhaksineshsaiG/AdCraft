import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Plus,
  Search,
  X,
  ChevronDown,
  Sparkles,
  Heart,
  LayoutGrid,
  List,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/LoadingSpinner';
import PosterCard, {
  type PosterStatus,
  type PosterStyle,
} from '../../components/posters/PosterCard';
import PosterPreview from '../../components/posters/PosterPreview';
import TemplateSelector, { type TemplateConfig } from '../../components/posters/TemplateSelector';
import AIContentPanel, { type ContentType } from '../../components/posters/AIContentPanel';
import GenerationProgress, { type GenerationPhase } from '../../components/posters/GenerationProgress';
import { cn } from '../../utils/cn';
import { motionStagger, motionFadeUp } from '../../styles/theme';
import { useGeneratedContent, useGenerateAllContent, useGenerateContent, useRegenerateContent, useSelectContentVariant } from '../../hooks/useGeneratedContent';
import { useProducts } from '../../hooks/useProducts';
import {
  useDeletePoster,
  useExportPoster,
  useGeneratePoster,
  usePosterPreview,
  usePosters,
  useSavePosterEdit,
  useTogglePosterFavourite,
} from '../../hooks/usePosters';
import { contentRecordsToBlocks, type BackendContent, toUiContentType } from '../../services/mappers';

const STATUS_OPTIONS: Array<{ value: PosterStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Ready' },
  { value: 'processing', label: 'Generating' },
  { value: 'pending', label: 'Queued' },
  { value: 'failed', label: 'Failed' },
];

const STYLE_OPTIONS: Array<{ value: PosterStyle | 'all'; label: string }> = [
  { value: 'all', label: 'All styles' },
  { value: 'modern', label: 'Modern' },
  { value: 'bold', label: 'Bold' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'playful', label: 'Playful' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'professional', label: 'Professional' },
];

function PosterGridSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return (
    <div
      className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      )}
      aria-label="Loading posters"
    >
      {Array.from({ length: viewMode === 'grid' ? 10 : 6 }).map((_, index) => (
        <div key={index} className="card overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-3 p-3.5">
            <Skeleton className="h-4 w-4/5 rounded" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4 rounded" />
            <div className="flex justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-6 w-6 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value:      T;
  onChange:   (v: T) => void;
  options:    Array<{ value: T; label: string }>;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="input appearance-none pr-8 py-2 text-sm cursor-pointer bg-white dark:bg-slate-900 min-w-0"
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

// â”€â”€â”€ Generate panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Layout contract:
//  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â† outer: flex-col, max-h-[82vh]
//  â”‚  scrollable body (flex-1 overflow-y-auto)       â”‚
//  â”‚    TemplateSelector                             â”‚
//  â”‚    AIContentPanel                               â”‚
//  â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
//  â”‚  sticky footer (flex-none)      â”‚  â† never scrolls away
//  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
//
// The outer wrapper is NOT overflow-hidden so scroll events are contained
// inside the child scroll area and never bubble up to the page.

function GeneratePanel({
  onClose,
  initialProductId,
}: {
  onClose:    () => void;
  initialProductId?: string;
}) {
  const [template, setTemplate] = useState<TemplateConfig>({
    style: 'modern', size: 'square', format: 'jpeg',
  });
  const [genAll,   setGenAll]   = useState(false);
  const [phase,    setPhase]    = useState<GenerationPhase>('idle');
  const [loadingGeneratedContentId, setLoadingGeneratedContentId] = useState<string | undefined>();
  const [loadingDraftContentType, setLoadingDraftContentType] = useState<ContentType | undefined>();
  const [selectedProductId, setSelectedProductId] = useState(initialProductId ?? '');
  const productsQuery = useProducts({ limit: 100 });
  const contentQuery = useGeneratedContent(selectedProductId || undefined);
  const generateContentMutation = useGenerateContent();
  const generateAllContentMutation = useGenerateAllContent();
  const regenerateContentMutation = useRegenerateContent();
  const selectVariantMutation = useSelectContentVariant();
  const generatePosterMutation = useGeneratePoster();
  const products = productsQuery.data?.products ?? [];
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const contentRecords = contentQuery.data?.records ?? [];
  const aiBlocks = useMemo(
    () => contentRecordsToBlocks(contentRecords, {
      contentId: loadingGeneratedContentId,
      contentType: loadingDraftContentType,
    }),
    [contentRecords, loadingGeneratedContentId, loadingDraftContentType]
  );
  const isSingleContentLoading = Boolean(loadingGeneratedContentId || loadingDraftContentType);

  function findContentRecord(type: ContentType): BackendContent | undefined {
    return contentRecords.find((record) => toUiContentType(record.contentType) === type);
  }

  function handleSelectVariant(type: ContentType, index: number) {
    const record = findContentRecord(type);
    if (record) selectVariantMutation.mutate({ contentId: record._id, variantIndex: index });
  }

  function handleRegenerateBlock(type: ContentType) {
    if (!selectedProductId || isSingleContentLoading) return;
    const record = findContentRecord(type);

    const options = { style: template.style, tone: 'friendly' as const, variantCount: 3 };
    if (record) {
      setLoadingGeneratedContentId(record._id);
      regenerateContentMutation.mutate({
        productId: selectedProductId,
        contentId: record._id,
        options,
      }, {
        onSettled: () => setLoadingGeneratedContentId(undefined),
      });
      return;
    }

    setLoadingDraftContentType(type);
    generateContentMutation.mutate({
      productId: selectedProductId,
      type,
      options,
    }, {
      onSettled: () => setLoadingDraftContentType(undefined),
    });
  }

  function handleRegenerateAll() {
    if (!selectedProductId || isSingleContentLoading) return;
    setGenAll(true);
    generateAllContentMutation.mutate({
      productId: selectedProductId,
      options: { style: template.style, tone: 'friendly', variantCount: 3 },
    }, {
      onSettled: () => {
        setGenAll(false);
      },
    });
  }

  async function handleGenerate() {
    if (!selectedProductId) return;
    try {
      setPhase('generating-content');
      const usableContent = contentRecords.find((record) =>
        record.status === 'completed' || record.status === 'approved'
      );
      let contentId = usableContent?._id;
      if (!contentId) {
        const generated = await generateContentMutation.mutateAsync({
          productId: selectedProductId,
          type: 'marketing_copy',
          options: { style: template.style, tone: 'friendly', variantCount: 1 },
        });
        contentId = generated._id;
      }
      setPhase('composing-image');
      await generatePosterMutation.mutateAsync({
        productId: selectedProductId,
        style: template.style,
        size: template.size,
        format: template.format,
        contentId,
        title: selectedProduct?.name,
      });
      setPhase('uploading');
      setPhase('completed');
    } catch {
      setPhase('failed');
    }
  }

  // â”€â”€ Generation in progress: show progress tracker, no scrollable content â”€â”€

  if (phase !== 'idle') {
    return (
      <div className="p-4">
        <GenerationProgress
          phase={phase}
          productName={selectedProduct?.name ?? 'Selected product'}
          onDismiss={phase === 'completed' ? onClose : undefined}
          onRetry={phase === 'failed' ? () => setPhase('idle') : undefined}
        />
      </div>
    );
  }

  // â”€â”€ Idle: scrollable content area + pinned footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    /*
     * Outer shell: flex-col with a viewport-relative max-height.
     * Intentionally NOT overflow-hidden â€” that would re-capture scroll events
     * and route them to the page instead of the inner scroll area.
     */
    <div className="flex flex-col max-h-[82vh]">

      {/*
       * Scrollable body.
       * flex-1 + min-h-0 ensures this div actually shrinks inside the flex parent
       * (without min-h-0 flex children default to min-height: auto and won't shrink).
       * overflow-y-auto creates an independent scroll context here.
       * scrollbar-thin keeps the scrollbar subtle (defined in globals.css).
       */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pt-4 pb-2 space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <label htmlFor="poster-product" className="label">Product</label>
          <select
            id="poster-product"
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            className="input text-sm bg-white dark:bg-slate-900"
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        <TemplateSelector value={template} onChange={setTemplate} />
        <AIContentPanel
          blocks={aiBlocks}
          onSelectVariant={handleSelectVariant}
          onRegenerateBlock={handleRegenerateBlock}
          onRegenerateAll={handleRegenerateAll}
          isGeneratingAll={genAll || generateAllContentMutation.isPending || contentQuery.isLoading}
        />
      </div>

      {/*
       * Sticky footer: flex-none keeps it outside the scroll area so it is
       * always visible regardless of how far the user has scrolled.
       * A top border + background ensure it visually separates from content.
       */}
      <div className="flex-none flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary btn-md flex-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedProductId || generatePosterMutation.isPending || generateContentMutation.isPending}
          className={cn(
            'btn btn-primary btn-md flex-1 gap-1.5',
            (generatePosterMutation.isPending || generateContentMutation.isPending) && 'btn-loading'
          )}
        >
          {!generatePosterMutation.isPending && !generateContentMutation.isPending && <Sparkles className="h-4 w-4" />}
          {!generatePosterMutation.isPending && !generateContentMutation.isPending && 'Generate'}
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ PostersPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function PostersPage() {
  const productIdFromUrl = new URLSearchParams(window.location.search).get('productId') ?? undefined;
  const [previewId,    setPreviewId]    = useState<string | null>(null);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(Boolean(productIdFromUrl));
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<PosterStatus | 'all'>('all');
  const [styleFilter,  setStyleFilter]  = useState<PosterStyle  | 'all'>('all');
  const [favOnly,      setFavOnly]      = useState(false);
  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('grid');
  const postersQuery = usePosters({
    generationStatus: statusFilter === 'all' ? undefined : statusFilter,
    isFavourited: favOnly || undefined,
    limit: 100,
  });
  const previewQuery = usePosterPreview(previewId ?? undefined);
  const exportPosterMutation = useExportPoster();
  const deletePosterMutation = useDeletePoster();
  const favouritePosterMutation = useTogglePosterFavourite();
  const savePosterEditMutation = useSavePosterEdit();
  const posters = postersQuery.data?.posters ?? [];
  const showInitialSkeleton = postersQuery.isLoading && !postersQuery.data;

  // â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const filtered = useMemo(() => {
    return posters.filter((p) => {
      const matchSearch = !search ||
        p.productName.toLowerCase().includes(search.toLowerCase()) ||
        p.storeName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.generationStatus === statusFilter;
      const matchStyle  = styleFilter  === 'all' || p.style            === styleFilter;
      const matchFav    = !favOnly || p.isFavourited;
      return matchSearch && matchStatus && matchStyle && matchFav;
    });
  }, [posters, search, statusFilter, styleFilter, favOnly]);

  const hasFilter = search || statusFilter !== 'all' || styleFilter !== 'all' || favOnly;

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setStyleFilter('all');
    setFavOnly(false);
  }

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const previewPoster = previewId
    ? (() => {
        const poster = posters.find((p) => p.id === previewId) ?? null;
        return poster && previewQuery.data?.previewUrl
          ? { ...poster, posterUrl: previewQuery.data.previewUrl }
          : poster;
      })()
    : null;

  function handleExport(id: string) {
    const poster = posters.find((p) => p.id === id);
    if (poster) exportPosterMutation.mutate({ posterId: id, format: poster.format });
  }

  function handleEdit(id: string) {
    const poster = posters.find((p) => p.id === id);
    if (poster && (!poster.isEditable || poster.editableUntil.getTime() <= Date.now())) return;
    setPreviewId(id);
    setEditId(id);
  }

  function handleDelete(id: string) {
    deletePosterMutation.mutate(id);
  }

  function handleFavourite(id: string) {
    favouritePosterMutation.mutate(id);
  }
  function handleNavigate(id: string) {
    setPreviewId(id);
    setEditId(null);
  }

  return (
    <>
      <div className="page-container py-7 space-y-6">

        {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <PageHeader
          title="Posters"
          subtitle="AI-generated product marketing posters for your stores"
          icon={ImageIcon}
          actions={
            <button
              onClick={() => setShowGenerate((v) => !v)}
              className="btn btn-primary btn-md gap-1.5"
            >
              <Plus className="h-4 w-4" />
              New poster
            </button>
          }
        />

        {/* â”€â”€ Generate panel (inline slide-down) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/*
         * The motion.div drives the height animation via `height: 0 â†’ auto`.
         * We keep `overflow-hidden` ONLY on the motion.div (the animator) so
         * the slide-open animation clips correctly.  Once the animation is
         * done the motion.div naturally settles at `height: auto` and the
         * GeneratePanel's own flex layout takes over â€” its inner scroll area
         * receives wheel events before they can propagate to the page.
         */}
        <AnimatePresence>
          {showGenerate && (
            <motion.div
              key="generate-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              // overflow-hidden is required for the height-clip animation to work,
              // but once the panel is open at `height: auto` it does NOT prevent
              // the inner div from scrolling independently â€” the child's own
              // overflow-y-auto scroll container is what the browser targets first.
              className="overflow-hidden rounded-2xl border border-brand-200 dark:border-brand-800/50 bg-white dark:bg-slate-900 shadow-card"
            >
              {/* Panel header â€” lives outside GeneratePanel to stay visible */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-500" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Generate new poster
                  </h2>
                </div>
                <button
                  onClick={() => setShowGenerate(false)}
                  className="btn btn-ghost btn-icon-sm"
                  aria-label="Close generate panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* The scrollable generate form */}
              <GeneratePanel
                onClose={() => setShowGenerate(false)}
                initialProductId={productIdFromUrl}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Toolbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              placeholder="Search posters or storesâ€¦"
              className="input pl-9 text-sm"
              aria-label="Search posters"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <FilterSelect<PosterStatus | 'all'>
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              className="w-36"
            />
            <FilterSelect<PosterStyle | 'all'>
              value={styleFilter}
              onChange={setStyleFilter}
              options={STYLE_OPTIONS}
              className="w-36"
            />

            {/* Favourite filter toggle */}
            <button
              onClick={() => setFavOnly((v) => !v)}
              aria-pressed={favOnly}
              className={cn(
                'btn btn-sm gap-1.5 px-3',
                favOnly
                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50 border'
                  : 'btn-secondary'
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', favOnly && 'fill-current')} />
              Favourites
            </button>

            {/* View mode toggle */}
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center transition-colors',
                    viewMode === mode
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                  aria-label={`${mode} view`}
                >
                  {mode === 'grid'
                    ? <LayoutGrid className="h-4 w-4" />
                    : <List       className="h-4 w-4" />
                  }
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* â”€â”€ Result count + clear filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {filtered.length}
            </span>
            {' '}of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {posters.length}
            </span>
            {' '}posters
          </p>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="btn btn-ghost btn-sm gap-1 text-brand-600 dark:text-brand-400 text-xs"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* â”€â”€ Grid / List / Empty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <AnimatePresence mode="wait">
          {showInitialSkeleton ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <PosterGridSkeleton viewMode={viewMode} />
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
                icon={ImageIcon}
                title="No posters found"
                description={
                  hasFilter
                    ? 'No posters match your current filters.'
                    : 'Generate your first AI-powered poster to get started.'
                }
                actions={
                  hasFilter
                    ? [{ label: 'Clear filters', onClick: clearFilters, variant: 'secondary' }]
                    : [{ label: 'Generate poster', onClick: () => setShowGenerate(true), variant: 'primary', icon: Plus }]
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={motionStagger(0.04)}
              initial="hidden"
              animate="show"
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              )}
            >
              {filtered.map((poster) => (
                <motion.div key={poster.id} variants={motionFadeUp}>
                  <PosterCard
                    poster={poster}
                    onPreview={(id) => setPreviewId(id)}
                    onExport={handleExport}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onFavourite={handleFavourite}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* â”€â”€ Lightbox preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <PosterPreview
        poster={previewPoster}
        posters={filtered}
        editMode={previewId === editId}
        onClose={() => { setPreviewId(null); setEditId(null); }}
        onExport={handleExport}
        onEdit={handleEdit}
        onFavourite={handleFavourite}
        onSaveEdit={(id, payload) => savePosterEditMutation.mutateAsync({ posterId: id, body: payload }).then(() => undefined)}
        onNavigate={handleNavigate}
      />
    </>
  );
}


