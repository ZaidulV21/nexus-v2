export interface QuotationItemInput {
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface CreateQuotationInput {
  leadId: string;
  clientId?: string;
  discount?: number;
  transportation?: number;
  installation?: number;
  items: QuotationItemInput[];
}

export interface ReviseQuotationInput {
  discount?: number;
  transportation?: number;
  installation?: number;
  items: QuotationItemInput[];
}

export interface ApproveQuotationInput {
  approvalMethod: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON';
}

export interface RequestQuotationRevisionInput {
  reason: string;
}
