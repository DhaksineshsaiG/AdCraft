import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Tag,
  Boxes,
  FileText,
  Image as ImageIcon,
  Flame,
  Loader2,
} from 'lucide-react';
import { GrowthAnalysisResult } from '../../services/growth.service';
import { cn } from '../../utils/cn';

interface TopOpportunityCardProps {
  analysis: GrowthAnalysisResult;
  productImage?: string;
  productPrice?: number;
  productCompareAtPrice?: number | null;
  productCurrency?: string;
  onLaunchCampaign: () => void;
  isLaunching: boolean;
}

export const TopOpportunityCard: React.FC<TopOpportunityCardProps> = ({
  analysis,
  productImage,
  productPrice,
  productCompareAtPrice,
  productCurrency = 'USD',
  onLaunchCampaign,
  isLaunching,
}) => {
  const [imgError, setImgError] = useState(false);

  const { topOpportunity, recommendation, catalogSummary, provider } = analysis;
  const { score, signals, reasons } = topOpportunity;

  // Authoritative signals from backend
  const displayPrice = productPrice ?? signals.price;
  const displayCurrency = productCurrency || signals.currency || 'USD';
  const displayCompareAt = productCompareAtPrice ?? signals.compareAtPrice;
  const discountPercent = signals.hasDiscount ? signals.discountPercent : null;

  // Signal breakdown indicators derived from actual signals
  const pricingMetric = signals.hasDiscount ? Math.min(100, Math.round(signals.discountPercent * 2)) : 50;
  const inventoryMetric = signals.isAvailable
    ? Math.min(100, signals.totalInventory !== null && signals.totalInventory > 10 ? 95 : 70)
    : 25;
  const contentMetric = signals.hasPrimaryImage && signals.hasDescription ? 95 : signals.hasPrimaryImage ? 65 : 35;

  const totalEvaluated = catalogSummary?.candidatesEvaluated || catalogSummary?.totalProducts || 1;

  const getProviderLabel = () => {
    switch (provider) {
      case 'openai':
        return 'OpenAI GPT-4o';
      case 'ollama':
        return 'Ollama AI';
      case 'deterministic-engine':
      default:
        return 'Deterministic Evaluator';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden mb-8 transition-all">
      {/* Top Banner: Agent Tag & Score Badge */}
      <div className="px-6 py-4 bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-transparent border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Top Growth Opportunity
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ranked #1 of {totalEvaluated} evaluated products
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Sparkles className="w-3 h-3 text-brand-500" />
          <span>Engine: {getProviderLabel()}</span>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Product & Score Gauge (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 pb-8 lg:pb-0 lg:pr-8">
            <div>
              {/* Product Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="h-20 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {productImage && !imgError ? (
                    <img
                      src={productImage}
                      alt={topOpportunity.productName}
                      onError={() => setImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {topOpportunity.productName}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    {displayPrice !== undefined && (
                      <span className="text-base font-bold text-brand-600 dark:text-brand-400">
                        {displayCurrency} {displayPrice}
                      </span>
                    )}
                    {displayCompareAt && (
                      <span className="text-xs text-slate-400 line-through">
                        {displayCurrency} {displayCompareAt}
                      </span>
                    )}
                    {discountPercent !== null && discountPercent > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Opportunity Score Indicator */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Opportunity Score
                  </span>
                  <span className="text-2xl font-black text-brand-600 dark:text-brand-400 tracking-tight">
                    {score} <span className="text-sm font-medium text-slate-400">/ 100</span>
                  </span>
                </div>

                {/* Score Bar */}
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${score}%` }}
                  />
                </div>

                {/* Deterministic Signals Checklist */}
                <div className="mt-4 space-y-2">
                  {reasons.slice(0, 3).map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal Dimension Bars */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Signal Breakdown
                </p>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-brand-500" /> Pricing Leverage
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{pricingMetric}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pricingMetric}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Boxes className="w-3 h-3 text-emerald-500" /> Inventory Depth
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{inventoryMetric}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${inventoryMetric}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-amber-500" /> Content Quality
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{contentMetric}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${contentMetric}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Strategic Recommendation & Action CTA (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Strategic Pipeline Banner */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  SIGNALS
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono">
                  AI REASONING
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                  CAMPAIGN ACTION
                </span>
              </div>

              {/* Suggested Campaign Title */}
              <div>
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Suggested Campaign
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {recommendation.suggestedCampaignName}
                </h3>
              </div>

              {/* Strategy & Offer Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Objective & Strategy
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {recommendation.objective}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {recommendation.strategy}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Suggested Offer & Audience
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {recommendation.suggestedOffer}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    Target: {recommendation.targetAudience}
                  </p>
                </div>
              </div>

              {/* AI Strategic Rationale */}
              <div className="bg-brand-50/50 dark:bg-brand-950/20 rounded-xl p-4 border border-brand-100 dark:border-brand-900/40">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <span>Agent Strategic Rationale</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {recommendation.rationale}
                </p>
              </div>
            </div>

            {/* Launch Campaign Action */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span>Phase 2 will formulate strategy and generate the promotional poster creative.</span>
              </div>

              <button
                type="button"
                onClick={onLaunchCampaign}
                disabled={isLaunching}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md',
                  'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-brand-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Preparing Campaign & Creative...</span>
                  </>
                ) : (
                  <>
                    <span>Launch AI Campaign</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopOpportunityCard;
