import {
  BillingAdapter,
  CreateCheckoutParams,
  CheckoutResult,
  RefundParams,
  RefundResult,
} from './billing-adapter.interface';
import crypto from 'crypto';

export class MockBillingAdapter implements BillingAdapter {
  readonly name = 'MOCK';

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const transactionId = `tx_mock_${crypto.randomBytes(8).toString('hex')}`;
    const checkoutUrl = `http://localhost:3000/subscription?checkout_id=${transactionId}&status=success`;

    return {
      checkoutUrl,
      transactionId,
      gateway: this.name,
      status: 'COMPLETED',
    };
  }

  async verifyPayment(gatewayPaymentId: string): Promise<boolean> {
    return Boolean(gatewayPaymentId && gatewayPaymentId.startsWith('tx_mock_'));
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    const gatewayRefundId = `ref_mock_${crypto.randomBytes(8).toString('hex')}`;

    return {
      success: true,
      gatewayRefundId,
      refundAmount: params.amount,
      status: 'COMPLETED',
    };
  }
}

export const defaultBillingAdapter = new MockBillingAdapter();
