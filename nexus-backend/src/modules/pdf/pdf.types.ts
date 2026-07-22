export type PdfDocumentType = 'QUOTATION' | 'INVOICE' | 'RECEIPT';

export interface CompanyBrandingData {
  companyName: string | null;
  legalBusinessName: string | null;
  logoUrl: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  cin: string | null;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  currency: string | null;
  currencySymbol: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
  upiId: string | null;
  qrCodeUrl: string | null;
  companySignatureUrl: string | null;
  companyStampUrl: string | null;
}

export interface PdfLineItem {
  description: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  hsnSacCode?: string;
}

export interface PdfRecipient {
  contactName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  gstin?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface PdfQuotationData {
  quotationNumber: string;
  versionNumber: number;
  status: string;
  createdAt: Date;
  validUntil?: Date | null;
  items: PdfLineItem[];
  subtotal: number;
  discount: number;
  gstAmount: number;
  transportation: number;
  installation: number;
  grandTotal: number;
  recipient: PdfRecipient;
  notes?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
}

export interface PdfInvoiceData {
  invoiceNumber: string;
  label: string;
  status: string;
  displayStatus: string;
  issuedAt: Date;
  dueDate?: Date | null;
  items: PdfLineItem[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  recipient: PdfRecipient;
  projectName?: string;
  projectNumber?: string;
}

export interface PdfReceiptData {
  receiptNumber: string;
  paymentId: string;
  amount: number;
  method: string;
  transactionReference?: string | null;
  referenceNote?: string | null;
  paidAt: Date;
  invoiceNumber: string;
  invoiceLabel: string;
  invoiceGrandTotal: number;
  invoicePaidAmount: number;
  invoiceOutstandingAmount: number;
  recipient: PdfRecipient;
  projectName?: string;
  projectNumber?: string;
}

export interface GeneratePdfInput {
  documentType: PdfDocumentType;
  documentId: string;
  forceRegenerate?: boolean;
}

export interface PdfGenerationResult {
  pdfUrl: string;
  generatedAt: Date;
  fileSize: number;
}
