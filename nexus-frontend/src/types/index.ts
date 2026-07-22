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

export interface ServiceUsage {
  leadServices: number;
  projectServices: number;
  quotationItems: number;
  total: number;
}

export interface Service {
  id: string;
  categoryId: string;
  category?: Category;
  name: string;
  description?: string | null;
  icon?: string | null;
  basePrice?: string | null;
  estimatedDuration?: string | null;
  requiresSiteVisit: SiteVisitRequirement;
  isActive: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Present only on the service detail endpoint. */
  usage?: ServiceUsage;
}

export const LEAD_SERVICE_STATUSES = [
  'NEW',
  'CONTACTED',
  'SITE VISIT SCHEDULED',
  'SITE VISIT COMPLETED',
  'QUOTE PREPARING',
  'QUOTE SENT',
  'NEGOTIATION',
  'APPROVED',
  'PROJECT CREATED',
] as const;

export const PROJECT_SERVICE_STATUSES = [
  'PROJECT CREATED',
  'PLANNING',
  'RESOURCES ASSIGNED',
  'WORK STARTED',
  'IN PROGRESS',
  'ON HOLD',
  'QUALITY INSPECTION',
  'COMPLETED',
  'HANDOVER',
  'CLOSED',
  'CANCELLED',
] as const;
export type WorkflowStatus = (typeof LEAD_SERVICE_STATUSES)[number] | (typeof PROJECT_SERVICE_STATUSES)[number];

// The sales pipeline stages an Admin may set by hand on a Lead Service.
// QUOTE SENT is workflow-driven (set when the first quotation is created /
// a quotation is sent) and PROJECT CREATED is the system-assigned hand-off -
// neither is ever offered in a dropdown. Mirrors the backend Status
// Engine's manual/automatic partition, which remains the enforcing
// authority.
export const MANUAL_LEAD_SERVICE_STATUSES = [
  'NEW',
  'CONTACTED',
  'SITE VISIT SCHEDULED',
  'SITE VISIT COMPLETED',
  'QUOTE PREPARING',
  'NEGOTIATION',
  'APPROVED',
] as const;

// Statuses controlled exclusively by the backend quotation/project workflow.
export const AUTOMATIC_LEAD_SERVICE_STATUSES = ['QUOTE SENT', 'PROJECT CREATED'] as const;

// Execution statuses an Admin may select on a Project Service. PROJECT
// CREATED is the system-assigned start state, never a manual target.
export const MANUAL_PROJECT_SERVICE_STATUSES = [
  'IN PROGRESS',
  'ON HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;

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
  archivedAt?: string | null;
  archivedById?: string | null;
  archiveReason?: string | null;
  createdAt: string;
  leadServices?: LeadService[];
}

export interface Client {
  id: string;
  clientNumber: string;
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
  serviceName?: string | null;
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

/** Business-facing summary of a related Lead / Client on API payloads. */
export interface LeadSummary {
  id: string;
  leadNumber: string;
  contactName: string;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  /** Present when the lead has been converted to a client. */
  client?: ClientSummary | null;
}

export interface ClientSummary {
  id: string;
  clientNumber: string;
  contactName: string;
  companyName?: string | null;
  email: string;
  phone: string;
  sourceLeadId?: string | null;
  sourceLead?: { id: string; leadNumber: string; contactName: string } | null;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  leadId?: string | null;
  lead?: LeadSummary;
  clientId?: string | null;
  client?: ClientSummary | null;
  status: QuotationStatus;
  activeVersionId?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  paymentTerms?: string | null;
  pdfUrl?: string | null;
  pdfGeneratedAt?: string | null;
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
  transactionReference?: string | null;
  referenceNote?: string | null;
  paidAt: string;
  recordedByUserId?: string;
  receiptUrl?: string | null;
  receiptGeneratedAt?: string | null;
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
  paymentCount?: number;
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

/** Business-facing reference for the entity a Timeline/Audit row points at.
 *  `label` is the business number (L-00001, Q-00002, ...); `name` is the
 *  human name where one exists. Populated server-side so the UI never has
 *  to display raw UUIDs. */
export interface EntityRef {
  label: string;
  name?: string | null;
}

export interface TimelineEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  description: string;
  actorUserId?: string | null;
  /** Business reference of the entity; null if it no longer resolves. */
  entityRef?: EntityRef | null;
  /** Human-readable actor (admin email or client number+name); null = system. */
  actorRef?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  entityRef?: EntityRef | null;
  actorRef?: string | null;
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

export interface CompanySetting {
  id: string;
  companyName: string | null;
  legalBusinessName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
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
  timezone: string | null;
  dateFormat: string | null;
  invoicePrefix: string | null;
  quotationPrefix: string | null;
  projectPrefix: string | null;
  clientPrefix: string | null;
  leadPrefix: string | null;
  defaultGstPercent: number | null;
  defaultPaymentTerms: string | null;
  companySignatureUrl: string | null;
  companyStampUrl: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
  upiId: string | null;
  qrCodeUrl: string | null;
  senderName: string | null;
  replyToEmail: string | null;
  supportEmail: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  youtube: string | null;
  createdAt: string;
  updatedAt: string;
}
