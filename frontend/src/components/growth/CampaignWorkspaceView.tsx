import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Download,
  Image as ImageIcon,
  ShieldCheck,
  CreditCard,
  Rocket,
  Loader2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BackendCampaign, approveCampaign } from '../../services/campaign.service';
import { getCampaignPayments, SafePaymentRecord } from '../../services/payment.service';
import CampaignCheckoutButton from '../campaigns/CampaignCheckoutButton';
import { cn } from '../../utils/cn';

interface CampaignWorkspaceViewProps {
  campaign: BackendCampaign;
  onCampaignUpdated: (updatedCampaign: BackendCampaign) => void;
}

const LIFECYCLE_STAGES = [
  { key: 'analysis', label: 'AI Analysis' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'creative', label: 'Creative' },
  { key: 'approval', label: 'Merchant Review' },
  { key: 'checkout', label: 'Razorpay' },
  { key: 'active', label: 'Active' },
] as const;

export const CampaignWorkspaceView: React.FC<CampaignWorkspaceViewProps> = ({
  campaign,
  onCampaignUpdated,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [verifiedPayment, setVerifiedPayment] = useState<SafePaymentRecord | null>(null);

  // Fetch safe verified payment details if campaign is active
  useEffect(() => {
    if (campaign.status === 'active') {
      getCampaignPayments(campaign.id)
        .then((payments) => {
          const verified = payments.find((p) => p.status === 'verified' || p.status === 'paid');
          if (verified) {
            setVerifiedPayment(verified);
          }
        })
        .catch((err) => {
          console.error('[CampaignWorkspaceView] Failed to fetch payment info:', err);
        });
    }
  }, [campaign.id, campaign.status]);

  // Determine active stepper index based on actual backend status
  const getActiveStepIndex = (): number => {
    switch (campaign.status) {
      case 'draft':
        return 1;
      case 'generating':
        return 2;
      case 'pending_approval':
        return 3;
      case 'approved':
        return 4;
      case 'active':
      case 'completed':
        return 5;
      case 'failed':
        return 2;
      default:
        return 0;
    }
  };

  const activeStep = getActiveStepIndex();

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      toast.loading('Authorizing campaign approval...', { id: 'approving-campaign' });
      const updated = await approveCampaign(campaign.id);
      toast.success('Campaign approved! Ready for Razorpay commercial activation.', {
        id: 'approving-campaign',
      });
      onCampaignUpdated(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve campaign.';
      toast.error(message, { id: 'approving-campaign' });
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>ACTIVE</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>APPROVED</span>
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>PENDING APPROVAL</span>
          </span>
        );
      case 'generating':
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span>GENERATING</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>FAILED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden mb-8 transition-all">
      {/* Workspace Header */}
      <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Campaign Workspace
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs text-slate-500">
                Created {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {campaign.name}
            </h2>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* 6-Stage Agentic Stepper */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isPast = idx < activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div
                  key={stage.key}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    isCurrent
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm'
                      : isPast
                      ? 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40'
                      : 'text-slate-400 dark:text-slate-600 bg-transparent'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                      isCurrent
                        ? 'bg-brand-500 text-white'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    )}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className="truncate">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Workspace Body: Strategy (Left) & Poster Preview (Right) */}
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Strategy Details Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Generating State Notice */}
            {(campaign.status === 'draft' || campaign.status === 'generating') && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-5 flex items-start gap-4">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                    Agentic Creative Generation in Progress
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    The Poster Intelligence Engine and Renderer are composing the creative layout. This campaign will reach <span className="font-semibold">PENDING APPROVAL</span> once rendering is complete.
                  </p>
                </div>
              </div>
            )}

            {/* Strategic Overview */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Objective & Strategy
                </span>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {campaign.objective}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {campaign.strategy}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Suggested Offer
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {campaign.suggestedOffer || 'High-converting discount offer'}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Audience
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {campaign.targetAudience || 'Target segment interested in this catalog category'}
                  </p>
                </div>
              </div>

              {campaign.rationale && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Strategic Rationale
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {campaign.rationale}
                  </p>
                </div>
              )}
            </div>

            {/* ACTION GATE: Merchant Approval Gate */}
            {campaign.status === 'pending_approval' && (
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Merchant Review Required (Human-in-the-Loop)
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-400 mt-1 leading-relaxed">
                      AI has completed analysis and generated the marketing creative. Review the strategy and preview before authorizing commercial execution.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-amber-200/60 dark:border-amber-900/30 flex items-center justify-between gap-4">
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Explicit sign-off required to proceed to Razorpay activation.
                  </span>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md',
                      'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-600/20',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Campaign</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ACTION GATE: Razorpay Commercial Activation Gate */}
            {campaign.status === 'approved' && (
              <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                      Campaign Approved — Ready for Commerce Execution
                    </h3>
                    <p className="text-xs text-indigo-800 dark:text-indigo-400 mt-1 leading-relaxed">
                      Merchant authorization complete. Launch the campaign through Razorpay Test Mode infrastructure to transition this campaign to <span className="font-semibold">ACTIVE</span>.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-indigo-200/60 dark:border-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    <span>Campaign Execution Fee: </span>
                    <span className="font-bold text-sm text-indigo-900 dark:text-indigo-100">₹499 INR</span>
                  </div>

                  <CampaignCheckoutButton
                    campaignId={campaign.id}
                    campaignName={campaign.name}
                    campaignStatus={campaign.status}
                    amount={499}
                    currency="INR"
                    onSuccess={() => {
                      onCampaignUpdated({
                        ...campaign,
                        status: 'active',
                      });
                    }}
                  />
                </div>
              </div>
            )}

            {/* ACTIVE STATE: Confirmed Commerce Activation */}
            {campaign.status === 'active' && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Rocket className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      🚀 CAMPAIGN ACTIVE — Verified Commercial Execution
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-1 leading-relaxed">
                      Server-side cryptographic signature verification succeeded. This campaign is fully activated and ready for distribution.
                    </p>
                  </div>
                </div>

                {/* Safe Real Payment Details */}
                <div className="mt-5 pt-4 border-t border-emerald-200/60 dark:border-emerald-900/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Execution Fee</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {verifiedPayment ? `${verifiedPayment.currency} ${verifiedPayment.amount}` : '₹499 INR'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Payment Status</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    </div>

                    {verifiedPayment?.razorpayPaymentId && (
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block mb-0.5">Payment Reference</span>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                          {verifiedPayment.razorpayPaymentId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Poster Preview Column (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start">
            <div className="w-full max-w-sm rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 self-start">
                Promotional Creative
              </span>

              {campaign.posterUrl ? (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md group">
                  <img
                    src={campaign.posterUrl}
                    alt={campaign.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <a
                      href={campaign.posterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/90 text-slate-900 hover:bg-white transition-all shadow-md"
                      title="Open full size"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <a
                      href={campaign.posterUrl}
                      download
                      className="p-2 rounded-lg bg-white/90 text-slate-900 hover:bg-white transition-all shadow-md"
                      title="Download Creative"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-xl bg-slate-200/60 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center p-6 text-center">
                  {campaign.status === 'generating' || campaign.status === 'draft' ? (
                    <>
                      <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Generating poster creative...
                      </p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-400">Creative asset not yet available</p>
                    </>
                  )}
                </div>
              )}

              {campaign.posterUrl && (
                <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>Aspect Ratio: 1:1 (Instagram/Square)</span>
                  <a
                    href={campaign.posterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <span>View full</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignWorkspaceView;
