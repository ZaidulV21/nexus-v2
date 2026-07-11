export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  hsnSacCode: string;
  taxRate: number;
}

export interface CreateInvoiceInput {
  projectId: string;
  clientId: string;
  label: string;
  items: InvoiceItemInput[];
}

export interface CancelInvoiceInput {
  reason: string;
}

export interface RecordPaymentInput {
  amount: number;
  method: string;
  referenceNote?: string;
}
