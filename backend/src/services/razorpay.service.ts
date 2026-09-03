import crypto from 'crypto';
import Razorpay from 'razorpay';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';
import { AppError } from '../middleware/errorMiddleware';

export interface CreateRazorpayOrderInput {
  amountInPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface VerifySignatureInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * RazorpayService
 * 
 * Secure SDK wrapper for Razorpay Test Mode integration.
 * Responsible for order creation and server-side HMAC SHA-256 signature verification.
 * Secret keys are strictly retained on the backend and never leaked.
 */
export class RazorpayService {
  private client: Razorpay | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      this.client = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  private getClient(): Razorpay {
    if (!this.client) {
      this.initClient();
    }
    if (!this.client || !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new AppError(
        'Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the environment.',
        StatusCodes.SERVICE_UNAVAILABLE,
        'RAZORPAY_NOT_CONFIGURED'
      );
    }
    return this.client;
  }

  /**
   * Creates an order with Razorpay in Test Mode.
   * Amount must be provided in currency subunits (e.g. paise for INR).
   */
  public async createOrder(
    input: CreateRazorpayOrderInput
  ): Promise<RazorpayOrderResult> {
    const client = this.getClient();

    try {
      console.info(
        `[RazorpayService] Creating order: amount=${input.amountInPaise} ${input.currency}, receipt=${input.receipt}`
      );

      const order = await client.orders.create({
        amount: input.amountInPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
      });

      console.info(`[RazorpayService] Order created successfully: ${order.id}`);

      return {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        receipt: order.receipt || input.receipt,
        status: order.status,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[RazorpayService] Failed to create Razorpay order: ${message}`);
      throw new AppError(
        `Failed to create Razorpay order: ${message}`,
        StatusCodes.BAD_GATEWAY,
        'RAZORPAY_API_ERROR'
      );
    }
  }

  /**
   * Authoritative server-side HMAC SHA-256 signature verification.
   * Compares the signature using constant-time equality to prevent timing attacks.
   */
  public verifyPaymentSignature(input: VerifySignatureInput): boolean {
    const secret = env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[RazorpayService] Cannot verify signature: RAZORPAY_KEY_SECRET is not configured.');
      return false;
    }

    if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
      return false;
    }

    try {
      const payload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(input.razorpaySignature, 'utf8');

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (err) {
      console.error('[RazorpayService] Error during signature verification:', err);
      return false;
    }
  }
}

const razorpayService = new RazorpayService();
export default razorpayService;
