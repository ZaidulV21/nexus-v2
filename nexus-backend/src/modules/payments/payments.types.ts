export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  receipt: string;
}

export interface RefundPaymentResponse {
  paymentId: string;
  status: 'REFUNDED';
  refundId?: string;
  refundStatus?: string;
}

export interface VerifyPaymentResponse {
  payment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    gatewayTransactionId: string;
    paidAt: string;
  };
  invoice: {
    id: string;
    paidAmount: number;
    outstandingAmount: number;
    displayStatus: string;
  };
}

// Razorpay payment entity as delivered in a payment.captured webhook payload.
export interface RazorpayWebhookPaymentEntity {
  id: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
}

// Outcome of processing a Razorpay webhook delivery. A 200 is always returned
// to the gateway; `processed` distinguishes a newly recorded payment from an
// acknowledged-but-ignored delivery (non-payment.captured, duplicate, or an
// event that cannot be attributed to a known invoice).
export interface WebhookResult {
  event: string;
  processed: boolean;
  paymentId?: string;
  alreadyProcessed?: boolean;
  reason?: string;
}
