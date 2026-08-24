export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  itemType: 'SUBSCRIPTION' | 'CREDIT_PACKAGE';
  itemId: string;
  itemName: string;
  billingCycle?: 'monthly' | 'annual';
  metadata?: Record<string, any>;
}

export interface CheckoutResult {
  checkoutUrl: string;
  transactionId: string;
  gateway: string;
  status: 'INITIATED' | 'COMPLETED';
}

export interface RefundParams {
  gatewayPaymentId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  gatewayRefundId: string;
  refundAmount: number;
  status: 'COMPLETED' | 'FAILED';
  errorMessage?: string;
}

export interface BillingAdapter {
  readonly name: string;
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;
  verifyPayment(gatewayPaymentId: string): Promise<boolean>;
  processRefund(params: RefundParams): Promise<RefundResult>;
}
