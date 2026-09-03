import type { Payment as PaymentRecord } from '@prisma/client';

export enum PaymentStatus {
  CREATED = 'created',
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  VERIFIED = 'verified',
}

export interface IPaymentDocument {
  _id: string;
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  failureReason?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  campaignId: string;
}

export interface CreateOrderResponse {
  paymentId: string;
  campaignId: string;
  campaignName: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number; // in whole currency units (e.g. 499 INR)
  amountInSubunits: number; // in paise (e.g. 49900)
  currency: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function mapPayment(record: PaymentRecord): IPaymentDocument {
  return {
    _id: record.id,
    id: record.id,
    amount: record.amount,
    currency: record.currency,
    status: record.status as unknown as PaymentStatus,
    razorpayOrderId: record.razorpayOrderId ?? undefined,
    razorpayPaymentId: record.razorpayPaymentId ?? undefined,
    razorpaySignature: record.razorpaySignature ?? undefined,
    failureReason: record.failureReason ?? undefined,
    verifiedAt: record.verifiedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    campaignId: record.campaignId,
  };
}
