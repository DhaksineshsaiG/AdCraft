import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Store as StoreIcon, Package } from 'lucide-react';
import { useStores } from '../../hooks/useStores';
import { useProducts } from '../../hooks/useProducts';
import { useStoreCampaigns, campaignKeys } from '../../hooks/useCampaigns';
import { useQueryClient } from '@tanstack/react-query';
import { analyzeStore, GrowthAnalysisResult } from '../../services/growth.service';
import {
  createCampaign,
  getCampaign,
  BackendCampaign,
  CreateCampaignPayload,
} from '../../services/campaign.service';
import StoreAnalysisHeader from '../../components/growth/StoreAnalysisHeader';
import TopOpportunityCard from '../../components/growth/TopOpportunityCard';
import CampaignWorkspaceView from '../../components/growth/CampaignWorkspaceView';
import CampaignsListCard from '../../components/growth/CampaignsListCard';
import EmptyState from '../../components/ui/EmptyState';
import PageDataLoader from '../../components/ui/PageDataLoader';

export const GrowthPage: React.FC = () => {
  const { campaignId: paramCampaignId } = useParams<{ campaignId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignId = paramCampaignId || searchParams.get('campaignId');
  const navigate = useNavigate();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: stores = [], isLoading: isLoadingStores } = useStores();

  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [analysis, setAnalysis] = useState<GrowthAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [activeCampaign, setActiveCampaign] = useState<BackendCampaign | null>(null);
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  // Set default store when stores load
  useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0]!.id);
    }
  }, [stores, selectedStoreId]);

  // Fetch campaigns using React Query with automatic store-keying & cache
  const campaignsQuery = useStoreCampaigns(selectedStoreId);
  const campaigns = campaignsQuery.data ?? [];
  const isCampaignsLoading = campaignsQuery.isPending && !campaignsQuery.data;

  // Fetch products count for selected store
  const { data: productData, isLoading: isLoadingProducts, isPending: isPendingProducts } = useProducts({
    storeId: selectedStoreId || undefined,
    limit: 1,
  });

  const isProductsLoading = isLoadingProducts || (isPendingProducts && !productData);
  const totalProducts = productData?.pagination.total ?? 0;

  // Synchronize campaign selection with route param or query param
  useEffect(() => {
    if (!campaignId) return;

    // 1. If already active, smooth scroll to workspace
    if (activeCampaign && (activeCampaign.id === campaignId || activeCampaign._id === campaignId)) {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // 2. Check if already loaded in store campaigns list
    const found = campaigns.find((c) => c.id === campaignId || c._id === campaignId);
    if (found) {
      setActiveCampaign(found);
      if (found.storeId && found.storeId !== selectedStoreId) {
        setSelectedStoreId(found.storeId);
      }
      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }

    // 3. Otherwise fetch campaign directly by ID from API (supports direct links, page refresh, cross-store)
    let isCancelled = false;
    getCampaign(campaignId)
      .then((camp) => {
        if (!isCancelled && camp) {
          setActiveCampaign(camp);
          if (camp.storeId && camp.storeId !== selectedStoreId) {
            setSelectedStoreId(camp.storeId);
          }
          setTimeout(() => {
            workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }
      })
      .catch((err) => {
        console.error('[GrowthPage] Failed to fetch campaign by ID:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [campaignId, campaigns, selectedStoreId, activeCampaign]);

  // Handle store analysis
  const handleAnalyzeStore = async () => {
    if (!selectedStoreId) return;

    setIsAnalyzing(true);
    try {
      toast.loading('Analyzing catalog opportunities...', { id: 'analyzing-store' });
      const result = await analyzeStore(selectedStoreId);
      setAnalysis(result);
      // When new analysis completes, highlight the top opportunity
      setActiveCampaign(null);
      toast.success(
        `Analysis complete! Top opportunity: ${result.topOpportunity.productName} (Score: ${result.topOpportunity.score})`,
        { id: 'analyzing-store' }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to analyze store catalog.';
      toast.error(message, { id: 'analyzing-store' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Launch AI Campaign from Top Opportunity
  const handleLaunchCampaign = async () => {
    if (!analysis) return;

    setIsLaunchingCampaign(true);
    try {
      toast.loading(
        'AI is formulating strategy, rendering poster creative, and uploading assets (takes ~30-45s)...',
        {
          id: 'launching-campaign',
        }
      );

      // Real contract mapping from Phase 1 recommendation to Phase 2 API
      const payload: CreateCampaignPayload = {
        storeId: analysis.storeId,
        productId: analysis.topOpportunity.productId,
        name: analysis.recommendation.suggestedCampaignName,
        objective: analysis.recommendation.objective,
        strategy: analysis.recommendation.strategy,
        suggestedOffer: analysis.recommendation.suggestedOffer,
        targetAudience: analysis.recommendation.targetAudience,
        rationale: analysis.recommendation.rationale,
      };

      const newCampaign = await createCampaign(payload);

      toast.success('Campaign created and creative generated! Awaiting merchant approval.', {
        id: 'launching-campaign',
      });

      setActiveCampaign(newCampaign);
      if (paramCampaignId) {
        navigate(`/growth/${newCampaign.id}`);
      } else {
        setSearchParams({ campaignId: newCampaign.id });
      }

      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);

      // Refresh campaigns list
      await queryClient.invalidateQueries({ queryKey: campaignKeys.store(selectedStoreId) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign.';
      toast.error(message, { id: 'launching-campaign' });
      // In case the backend finished right around the error, refresh campaign list
      await queryClient.invalidateQueries({ queryKey: campaignKeys.store(selectedStoreId) });
    } finally {
      setIsLaunchingCampaign(false);
    }
  };

  // Select campaign from list and open workspace
  const handleSelectCampaign = (camp: BackendCampaign) => {
    setActiveCampaign(camp);
    if (paramCampaignId) {
      navigate(`/growth/${camp.id}`);
    } else {
      setSearchParams({ campaignId: camp.id });
    }
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Clear workspace and focus on latest opportunity
  const handleNewAnalysis = () => {
    setActiveCampaign(null);
    setSearchParams({});
    if (paramCampaignId) {
      navigate('/growth');
    }
  };

  // Find product details for top opportunity
  const topProduct = productData?.products.find(
    (p) => p.id === analysis?.topOpportunity.productId
  );

  if (isLoadingStores) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <PageDataLoader
          message="Loading Growth Command Center…"
          description="Connecting to AI Growth Agent and product stores"
        />
      </div>
    );
  }

  // Empty State: No stores connected
  if (stores.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={StoreIcon}
          title="Connect a Store to Start AI Growth Analysis"
          description="The AI Growth Agent needs access to your product catalog to detect pricing leverage, stock readiness, and high-impact marketing opportunities."
          actions={[
            {
              label: 'Connect a Store',
              href: '/stores',
              variant: 'primary',
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. Primary Header & Store Selector */}
      <StoreAnalysisHeader
        stores={stores}
        selectedStoreId={selectedStoreId}
        onSelectStore={(id) => {
          setSelectedStoreId(id);
          setAnalysis(null);
          setActiveCampaign(null);
          setSearchParams({});
          if (paramCampaignId) {
            navigate('/growth');
          }
        }}
        onAnalyze={handleAnalyzeStore}
        isAnalyzing={isAnalyzing}
        lastAnalyzedAt={analysis?.analyzedAt}
      />

      {/* Empty State: Store has 0 products */}
      {!isProductsLoading && productData !== undefined && totalProducts === 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 text-center mb-8">
          <Package className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
            No Products Synced in this Store
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 max-w-md mx-auto">
            Sync products from your Shopify or WooCommerce store so the AI Growth Brain can evaluate opportunities.
          </p>
          <div className="mt-4">
            <Link
              to="/stores"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 transition-all"
            >
              Sync Store Products
            </Link>
          </div>
        </div>
      )}

      {/* 2. Active Campaign Workspace View (If a campaign is selected or just created) */}
      {activeCampaign && (
        <div ref={workspaceRef} id="campaign-workspace" className="scroll-mt-8">
          <CampaignWorkspaceView
            campaign={activeCampaign}
            onCampaignUpdated={(updated) => {
              setActiveCampaign(updated);
              queryClient.invalidateQueries({ queryKey: campaignKeys.store(selectedStoreId) });
            }}
          />
        </div>
      )}

      {/* 3. Top Growth Opportunity Hero Card (If analysis exists) */}
      {analysis && !activeCampaign && (
        <TopOpportunityCard
          analysis={analysis}
          productImage={topProduct?.imageUrl}
          productPrice={topProduct?.price}
          productCompareAtPrice={undefined}
          productCurrency={topProduct?.currency || 'USD'}
          onLaunchCampaign={handleLaunchCampaign}
          isLaunching={isLaunchingCampaign}
        />
      )}

      {/* Prompt to analyze if no analysis and no active campaign */}
      {!analysis && !activeCampaign && !isCampaignsLoading && !isProductsLoading && campaigns.length === 0 && totalProducts > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-12 text-center shadow-sm mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 mx-auto mb-4 border border-brand-500/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Ready to Discover High-Impact Campaigns?
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Click <span className="font-semibold text-brand-600 dark:text-brand-400">Analyze My Store</span> above to let the AI agent inspect your product catalog and formulate your next marketing campaign.
          </p>
        </div>
      )}

      {/* 4. Campaigns List (History of created campaigns for this store) */}
      <CampaignsListCard
        campaigns={campaigns}
        activeCampaignId={activeCampaign?.id}
        onSelectCampaign={handleSelectCampaign}
        onNewAnalysis={handleNewAnalysis}
        isLoading={isCampaignsLoading}
      />
    </div>
  );
};

export default GrowthPage;
