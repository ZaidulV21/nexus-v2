declare module 'razorpay' {
  interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    created_at: number;
    notes: Record<string, string>;
  }

  interface RazorpayOrderCreateParams {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }

  interface RazorpayPayment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    order_id: string;
    method: string;
    captured: boolean;
    description: string;
    email: string;
    contact: string;
    notes: Record<string, string>;
    created_at: number;
  }

  class Razorpay {
    constructor(options: { key_id: string; key_secret: string });
    orders: {
      create(params: RazorpayOrderCreateParams): Promise<RazorpayOrder>;
      fetch(orderId: string): Promise<RazorpayOrder>;
    };
    payments: {
      fetch(paymentId: string): Promise<RazorpayPayment>;
    };
  }

  export default Razorpay;
}
