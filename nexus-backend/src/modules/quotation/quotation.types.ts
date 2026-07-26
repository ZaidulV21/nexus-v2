export interface QuotationItemInput {
  serviceId: string;
  serviceName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface CreateQuotationInput {
  clientId: string; // REQUIRED - quotations must be created for Clients only
  leadId: string; // REQUIRED - the specific Lead this quotation is associated with
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
