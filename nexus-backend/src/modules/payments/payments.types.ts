export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  receipt: string;
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
