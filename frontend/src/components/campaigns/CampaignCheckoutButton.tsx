import React, { useState } from 'react';
import { CreditCard, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCampaignOrder,
  loadRazorpayScript,
  verifyCampaignPayment,
  VerifyPaymentResponse,
} from '../../services/payment.service';
import { cn } from '../../utils/cn';

interface CampaignCheckoutButtonProps {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  amount?: number;
  currency?: string;
  onSuccess?: (result: VerifyPaymentResponse) => void;
  className?: string;
}

export const CampaignCheckoutButton: React.FC<CampaignCheckoutButtonProps> = ({
  campaignId,
  campaignName,
  campaignStatus,
  amount = 499,
  currency = 'INR',
  onSuccess,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(campaignStatus === 'active');

  // If already active, display an active badge
  if (isActivated || campaignStatus === 'active') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          className
        )}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span>Campaign Active</span>
      </div>
    );
  }

  // Only approved campaigns can initiate checkout
  if (campaignStatus !== 'approved') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-800/40 border border-slate-700/40',
          className
        )}
      >
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        <span>Awaiting Merchant Approval</span>
      </div>
    );
  }

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      // 1. Ensure Razorpay script is loaded dynamically
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
        setIsLoading(false);
        return;
      }

      // 2. Create server-authorized order
      const order = await createCampaignOrder(campaignId);

      // 3. Initialize Razorpay options (Test Mode)
      const options = {
        key: order.razorpayKeyId,
        amount: order.amountInSubunits,
        currency: order.currency,
        name: 'AdCraft Commerce Agent',
        description: `Activation: ${campaignName}`,
        order_id: order.razorpayOrderId,
        notes: {
          campaignId: order.campaignId,
          campaignName: order.campaignName,
        },
        theme: {
          color: '#6366f1', // Indigo brand accent
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            toast('Payment modal closed.', { icon: 'ℹ️' });
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            toast.loading('Verifying payment signature with server...', { id: 'verifying-payment' });

            // 4. Cryptographic server-side verification
            const verifyResult = await verifyCampaignPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success('Payment verified! Campaign is now ACTIVE.', { id: 'verifying-payment' });
            setIsActivated(true);
            setIsLoading(false);

            if (onSuccess) {
              onSuccess(verifyResult);
            }
          } catch (err: unknown) {
            const errorMsg =
              err instanceof Error
                ? err.message
                : 'Payment verification failed. Please contact support.';
            toast.error(errorMsg, { id: 'verifying-payment' });
            setIsLoading(false);
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to initiate campaign checkout.';
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing Checkout...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          <span>Activate Campaign ({currency === 'INR' ? '₹' : currency} {amount})</span>
        </>
      )}
    </button>
  );
};

export default CampaignCheckoutButton;
