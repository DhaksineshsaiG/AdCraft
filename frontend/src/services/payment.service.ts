import api from './auth.service';
import type { ApiResponse } from './api.types';

export interface CreateOrderResponse {
  paymentId: string;
  campaignId: string;
  campaignName: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  amountInSubunits: number;
  currency: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    verifiedAt: string;
  };
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  alreadyVerified: boolean;
}

export interface SafePaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  verifiedAt?: string;
  createdAt: string;
}

/**
 * Dynamically loads the Razorpay standard checkout.js script.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load checkout script.');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

/**
 * Initiates a Razorpay Test Mode order on the backend for an approved campaign.
 */
export async function createCampaignOrder(
  campaignId: string
): Promise<CreateOrderResponse> {
  const { data } = await api.post<ApiResponse<CreateOrderResponse>>(
    `/payments/campaigns/${campaignId}/order`
  );
  return data.data;
}

/**
 * Submits checkout results to the server for authoritative signature verification.
 */
export async function verifyCampaignPayment(
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResponse> {
  const { data } = await api.post<ApiResponse<VerifyPaymentResponse>>(
    '/payments/verify',
    payload
  );
  return data.data;
}

/**
 * Fetches safe payment records for a campaign from the backend.
 */
export async function getCampaignPayments(
  campaignId: string
): Promise<SafePaymentRecord[]> {
  const { data } = await api.get<ApiResponse<SafePaymentRecord[]>>(
    `/payments/campaigns/${campaignId}`
  );
  return data.data;
}
