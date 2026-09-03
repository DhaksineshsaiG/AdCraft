import prisma from '../database/prisma';
import { env } from '../config/env';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorMiddleware';
import {
  CreateOrderResponse,
  IPaymentDocument,
  mapPayment,
  VerifyPaymentPayload,
} from '../models/Payment';
import { ICampaignDocument, mapCampaign } from '../models/Campaign';
import razorpayService from './razorpay.service';

export interface VerifyPaymentResult {
  payment: IPaymentDocument;
  campaign: ICampaignDocument;
  alreadyVerified: boolean;
}

export class PaymentService {
  /**
   * Creates a Razorpay payment order for an APPROVED campaign.
   *
   * Architectural Guarantees:
   * 1. Only campaigns in APPROVED status can create payment orders.
   * 2. Pricing is strictly determined server-side (CAMPAIGN_EXECUTION_AMOUNT).
   * 3. Order persistence safety: A local Payment record is created FIRST before
   *    calling external Razorpay APIs, preventing orphaned external orders.
   * 4. Razorpay Key Secret is NEVER returned.
   */
  public async createPaymentOrder(
    campaignId: string,
    requestingUserId: string
  ): Promise<CreateOrderResponse> {
    console.info(`[PaymentService] Initiating payment order creation for campaign: ${campaignId}`);

    // 1. Verify campaign existence and ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { store: true },
    });

    if (!campaign) {
      console.warn(`[PaymentService] Campaign not found: ${campaignId}`);
      throw new NotFoundError('Campaign');
    }

    if (campaign.ownerId !== requestingUserId) {
      console.warn(
        `[PaymentService] Unauthorized payment creation attempt for campaign: ${campaignId} by user: ${requestingUserId}`
      );
      throw new ForbiddenError('You do not have permission to create a payment order for this campaign.');
    }

    // 2. Enforce Merchant Approval Gate constraint: Must be APPROVED
    if (campaign.status !== 'approved') {
      console.warn(
        `[PaymentService] Blocked payment attempt: Campaign ${campaignId} is in "${campaign.status}" state (must be "approved").`
      );
      throw new ValidationError(
        `Cannot create payment order for campaign in "${campaign.status}" state. Only campaigns in "approved" status can create payment orders.`
      );
    }

    // 3. Prevent duplicate active/completed payments
    const existingVerified = await prisma.payment.findFirst({
      where: {
        campaignId,
        status: { in: ['verified', 'paid'] },
      },
    });

    if (existingVerified) {
      throw new ValidationError(
        'A successful payment has already been verified for this campaign.'
      );
    }

    // 4. Server-side authoritative pricing (in INR and paise)
    const amountInInr = env.CAMPAIGN_EXECUTION_AMOUNT;
    const amountInPaise = amountInInr * 100;

    // 5. Order Persistence Safety: Create local Payment record FIRST
    const pendingPayment = await prisma.payment.create({
      data: {
        amount: amountInInr,
        currency: 'INR',
        status: 'created',
        campaignId: campaign.id,
      },
    });

    console.info(`[PaymentService] Pre-order payment record created: ${pendingPayment.id}`);

    // 6. Invoke Razorpay SDK to create order
    try {
      const receiptId = `rcpt_${pendingPayment.id.replace(/-/g, '').substring(0, 16)}`;
      const razorpayOrder = await razorpayService.createOrder({
        amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          campaignId: campaign.id,
          paymentId: pendingPayment.id,
          storeId: campaign.storeId,
          campaignName: campaign.name.substring(0, 40),
        },
      });

      // Attach Razorpay order ID to the local record
      const updatedPayment = await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          razorpayOrderId: razorpayOrder.id,
          status: 'pending',
        },
      });

      console.info(
        `[PaymentService] Razorpay order ${razorpayOrder.id} successfully attached to payment ${updatedPayment.id}`
      );

      return {
        paymentId: updatedPayment.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        amount: amountInInr,
        amountInSubunits: amountInPaise,
        currency: 'INR',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[PaymentService] Order creation failed for payment ${pendingPayment.id}: ${message}`
      );

      // Safe recovery: Mark local Payment record as failed
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: 'failed',
          failureReason: `Razorpay order creation failed: ${message}`,
        },
      }).catch((dbErr) => {
        console.error('[PaymentService] Failed to record payment failure state:', dbErr);
      });

      throw err;
    }
  }

  /**
   * Authoritative Payment Verification Gate:
   * 
   * Verifies the cryptographic HMAC SHA-256 signature on the server.
   * Only after successful backend verification does the Payment status become VERIFIED
   * and the Campaign transition from APPROVED -> ACTIVE.
   */
  public async verifyPayment(
    payload: VerifyPaymentPayload,
    requestingUserId: string
  ): Promise<VerifyPaymentResult> {
    console.info(
      `[PaymentService] Verifying payment for Razorpay order: ${payload.razorpay_order_id}`
    );

    // 1. Locate local Payment record
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: payload.razorpay_order_id },
      include: {
        campaign: {
          include: { store: true },
        },
      },
    });

    if (!payment) {
      console.warn(
        `[PaymentService] Payment not found for order: ${payload.razorpay_order_id}`
      );
      throw new NotFoundError('Payment record for the specified order');
    }

    // 2. Validate merchant ownership
    if (payment.campaign.ownerId !== requestingUserId) {
      console.warn(
        `[PaymentService] Unauthorized verification attempt for order ${payload.razorpay_order_id} by user: ${requestingUserId}`
      );
      throw new ForbiddenError('You do not have permission to verify this payment.');
    }

    // 3. Idempotency handling: If already verified, return cleanly without duplicate transitions
    if (payment.status === 'verified') {
      console.info(
        `[PaymentService] Payment ${payment.id} is already verified. Returning existing verification record.`
      );
      return {
        payment: mapPayment(payment),
        campaign: mapCampaign(payment.campaign),
        alreadyVerified: true,
      };
    }

    // 4. Authoritative server-side HMAC SHA-256 signature verification
    const isValid = razorpayService.verifyPaymentSignature({
      razorpayOrderId: payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpay_payment_id,
      razorpaySignature: payload.razorpay_signature,
    });

    if (!isValid) {
      console.warn(
        `[PaymentService] Invalid signature received for payment: ${payment.id}, order: ${payload.razorpay_order_id}`
      );

      // Record verification failure on the payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          failureReason: 'Invalid cryptographic payment signature',
          razorpayPaymentId: payload.razorpay_payment_id,
          razorpaySignature: payload.razorpay_signature,
        },
      });

      // Campaign remains in APPROVED status — NEVER activated
      throw new ValidationError(
        'Payment verification failed. The provided payment signature is invalid.'
      );
    }

    // 5. Successful Verification: Mark Payment as VERIFIED
    console.info(
      `[PaymentService] Payment signature verified. Marking payment ${payment.id} as VERIFIED.`
    );

    const verifiedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'verified',
        razorpayPaymentId: payload.razorpay_payment_id,
        razorpaySignature: payload.razorpay_signature,
        verifiedAt: new Date(),
      },
    });

    // 6. Commerce Activation: Transition Campaign from APPROVED -> ACTIVE
    const activatedCampaign = await prisma.campaign.update({
      where: { id: payment.campaignId },
      data: {
        status: 'active',
      },
    });

    console.info(
      `[PaymentService] Campaign ${activatedCampaign.id} successfully transitioned to ACTIVE following verified payment.`
    );

    return {
      payment: mapPayment(verifiedPayment),
      campaign: mapCampaign(activatedCampaign),
      alreadyVerified: false,
    };
  }

  /**
   * Retrieves payment history for a campaign with ownership verification.
   */
  public async getPaymentByCampaign(
    campaignId: string,
    requestingUserId: string
  ): Promise<IPaymentDocument[]> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.ownerId !== requestingUserId) {
      throw new ForbiddenError('You do not have permission to view payments for this campaign.');
    }

    const payments = await prisma.payment.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map(mapPayment);
  }
}

const paymentService = new PaymentService();
export default paymentService;
