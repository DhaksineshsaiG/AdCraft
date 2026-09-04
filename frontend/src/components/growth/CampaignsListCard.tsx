import React from 'react';
import { Sparkles, ArrowRight, Clock, ShieldCheck, Rocket, AlertCircle } from 'lucide-react';
import { BackendCampaign } from '../../services/campaign.service';
import { cn } from '../../utils/cn';
import PageDataLoader from '../ui/PageDataLoader';

interface CampaignsListCardProps {
  campaigns: BackendCampaign[];
  activeCampaignId?: string;
  onSelectCampaign: (campaign: BackendCampaign) => void;
  onNewAnalysis: () => void;
  isLoading?: boolean;
}

export const CampaignsListCard: React.FC<CampaignsListCardProps> = ({
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  onNewAnalysis,
  isLoading = false,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Rocket className="w-3.5 h-3.5 text-emerald-500" />;
      case 'approved':
        return <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />;
      case 'pending_approval':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm mb-8 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Store Campaigns {isLoading ? '' : `(${campaigns.length})`}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select a campaign to inspect strategy, approval status, and commercial execution.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewAnalysis}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-all"
        >
          <Sparkles className="w-3 h-3 text-brand-500" />
          <span>Latest Opportunity</span>
        </button>
      </div>

      {isLoading ? (
        <PageDataLoader
          message="Loading store campaigns…"
          description="Retrieving campaign strategies and commercial execution"
          compact
        />
      ) : campaigns.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">
            No campaigns created yet for this store. Run an analysis above to launch your first AI campaign!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {campaigns.map((camp) => {
            const isSelected = camp.id === activeCampaignId;

            return (
              <button
                key={camp.id}
                type="button"
                onClick={() => onSelectCampaign(camp)}
                className={cn(
                  'text-left p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between group',
                  isSelected
                    ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {getStatusIcon(camp.status)}
                      <span>{camp.status.replace('_', ' ')}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {camp.name}
                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {camp.objective}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between text-[11px] font-medium text-brand-600 dark:text-brand-400">
                  <span>View Workspace</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignsListCard;
