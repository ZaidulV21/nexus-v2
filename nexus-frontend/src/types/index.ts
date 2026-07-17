// Shared domain types, mirrored from the Nexus backend's Prisma schema.
// Keep these in sync with backend/prisma/schema.prisma when it changes.

export type ActorType = 'ADMIN' | 'CLIENT';

export interface AuthActor {
  id: string;
  email: string;
  type: ActorType;
  role?: string;
}

export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  isActive: boolean;
  children?: Category[];
}

export type SiteVisitRequirement = 'YES' | 'NO' | 'OPTIONAL';

export interface Service {
  id: string;
  categoryId: string;
  category?: Category;
  name: string;
  description?: string | null;
  icon?: string | null;
  basePrice?: string | null;
  requiresSiteVisit: SiteVisitRequirement;
  isActive: boolean;
}

export const LEAD_SERVICE_STATUSES = [
  'NEW',
  'QUALIFIED',
  'CONTACTED',
  'SITE VISIT',
  'QUOTE PREPARING',
  'QUOTE SENT',
  'NEGOTIATION',
  'APPROVED',
  'PROJECT CREATED',
  'IN PROGRESS',
  'ON HOLD',
  'COMPLETED',
  'CLOSED',
  'ARCHIVED',
] as const;
export type WorkflowStatus = (typeof LEAD_SERVICE_STATUSES)[number];

export interface LeadService {
  id: string;
  leadId: string;
  serviceId: string;
  service?: Service;
  status: WorkflowStatus;
  questionnaireAnswers?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  leadNumber: string;
  contactName: string;
  phone: string;
  email?: string | null;
  companyName?: string | null;
  source: string;
  convertedAt?: string | null;
  createdAt: string;
  leadServices?: LeadService[];
}

export interface Client {
  id: string;
  companyName?: string | null;
  contactName: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectService {
  id: string;
  projectId: string;
  serviceId: string;
  service?: Service;
  leadServiceId?: string | null;
  assignedQuotationVersionId?: string | null;
  assignedQuotationVersion?: QuotationVersion & { quotation?: Quotation };
  status: WorkflowStatus;
  progressPercentage?: number;
  statusHistory?: StatusTransitionLog[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StatusTransitionLog {
  id: string;
  entityType: string;
  entityId: string;
  fromStatus?: string | null;
  toStatus: string;
  actorUserId?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface ProjectQuotationSummary {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  activeVersionId?: string | null;
  versionId: string;
  versionNumber: number;
  grandTotal: string;
  approvalStatus: string;
}

export interface Project {
  id: string;
  projectNumber: string;
  leadId: string;
  clientId: string;
  client?: Client;
  lead?: Lead;
  quotations?: ProjectQuotationSummary[];
  aggregateStatus?: string;
  completedServices?: number;
  totalServices?: number;
  completionPercentage?: number;
  projectServices?: ProjectService[];
  createdAt: string;
  updatedAt?: string;
}

export interface QuotationItem {
  id: string;
  serviceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
}

export interface QuotationVersion {
  id: string;
  quotationId: string;
  versionNumber: number;
  isActive: boolean;
  subtotal: string;
  discount: string;
  gstAmount: string;
  transportation: string;
  installation: string;
  grandTotal: string;
  items: QuotationItem[];
  approvals?: Array<{ id: string; approvalMethod: string; approvedAt: string; approvedByUserId: string }>;
  createdAt: string;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'NEGOTIATION' | 'APPROVED' | 'ACCEPTED' | 'REJECTED';

export interface Quotation {
  id: string;
  quotationNumber: string;
  leadId: string;
  lead?: Pick<Lead, 'id' | 'leadNumber'> & Partial<Lead>;
  clientId?: string | null;
  status: QuotationStatus;
  activeVersionId?: string | null;
  versions: QuotationVersion[];
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  hsnSacCode: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  method: string;
  referenceNote?: string | null;
  paidAt: string;
}

export type InvoiceStatus = 'ISSUED' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  project?: Project;
  clientId: string;
  client?: Client;
  label: string;
  status: InvoiceStatus;
  displayStatus?: string;
  cancelReason?: string | null;
  subtotal: string;
  gstAmount: string;
  grandTotal: string;
  dueDate?: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  paidAmount?: number;
  outstandingAmount?: number;
  relatedQuotation?: ProjectQuotationSummary | null;
  pdfUrl?: string | null;
  issuedAt: string;
}

export interface FinancialSummary {
  projectId: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  invoiceCount: number;
}

export type DocumentEntityType = 'LEAD' | 'PROJECT';

export interface NexusDocument {
  id: string;
  entityType: DocumentEntityType;
  entityId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: ActorType;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  description: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
