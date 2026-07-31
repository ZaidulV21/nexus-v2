import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';

export const invoiceRepository = {
  create(
    data: {
      invoiceNumber: string;
      projectId: string;
      clientId: string;
      label: string;
      subtotal: number;
      gstAmount: number;
      grandTotal: number;
      createdByUserId: string;
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.invoice.create({ data });
  },

  createItems(invoiceId: string, items: any[], tx: Prisma.TransactionClient) {
    return Promise.all(items.map((item) => tx.invoiceItem.create({ data: { ...item, invoiceId } })));
  },

  findById(id: string) {
    return prisma.invoice.findFirst({
      where: { id },
      include: {
        items: true,
        payments: true,
        client: true,
        project: {
          include: {
            lead: true,
            projectServices: {
              include: {
                assignedQuotationVersion: {
                  include: { quotation: true, approvals: true },
                },
              },
            },
          },
        },
      },
    });
  },

  // Only ever flips `status` (and records the reason) - no financial field
  // on an issued invoice is ever mutated by any code path.
  cancel(id: string, reason: string) {
    return prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED', cancelReason: reason } });
  },

  markSent(id: string) {
    return prisma.invoice.update({ where: { id }, data: { status: 'ISSUED' } });
  },

  async list(pagination: PaginationParams) {
    const where: any = {};
    if (pagination.search) {
      where.OR = [
        { invoiceNumber: { contains: pagination.search, mode: 'insensitive' } },
        { client: { contactName: { contains: pagination.search, mode: 'insensitive' } } },
        { client: { companyName: { contains: pagination.search, mode: 'insensitive' } } },
        { project: { projectNumber: { contains: pagination.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'issuedAt']: pagination.sortOrder },
        include: {
          payments: true,
          client: true,
          project: {
            include: {
              lead: true,
              projectServices: {
                include: {
                  assignedQuotationVersion: {
                    include: { quotation: true, approvals: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);
    return { items, total };
  },

  listForProject(projectId: string) {
    return prisma.invoice.findMany({
      where: { projectId },
      include: {
        items: true,
        payments: true,
        client: true,
        project: {
          include: {
            lead: true,
            projectServices: {
              include: {
                assignedQuotationVersion: {
                  include: { quotation: true, approvals: true },
                },
              },
            },
          },
        },
      },
    });
  },

  listForClient(clientId: string) {
    return prisma.invoice.findMany({
      where: { clientId, status: { not: 'DRAFT' } },
      include: { items: true, payments: true, client: true, project: true },
    });
  },
};

export interface PaymentListFilters {
  skip: number;
  take: number;
  search?: string;
  status?: string;
  clientId?: string;
  invoiceId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export const paymentRepository = {
  async listAll(filters: PaymentListFilters) {
    const where: any = {};
    if (filters.search) {
      where.OR = [
        { invoice: { invoiceNumber: { contains: filters.search, mode: 'insensitive' } } },
        { client: { contactName: { contains: filters.search, mode: 'insensitive' } } },
        { client: { companyName: { contains: filters.search, mode: 'insensitive' } } },
        { project: { projectNumber: { contains: filters.search, mode: 'insensitive' } } },
        { transactionReference: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.invoiceId) where.invoiceId = filters.invoiceId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.dateFrom || filters.dateTo) {
      where.paidAt = {};
      if (filters.dateFrom) where.paidAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.paidAt.lte = new Date(filters.dateTo);
    }

    const orderBy: any = {};
    orderBy[filters.sortBy || 'paidAt'] = filters.sortOrder;

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy,
        include: {
          invoice: { select: { invoiceNumber: true, grandTotal: true, status: true } },
          client: { select: { contactName: true, companyName: true } },
          project: { select: { projectNumber: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return { items, total };
  },

  create(
    data: {
      invoiceId: string;
      clientId: string;
      projectId: string;
      amount: number;
      method: string;
      status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
      transactionReference?: string;
      referenceNote?: string;
      recordedByUserId: string;
      gatewayTransactionId?: string;
      gatewayMetadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.payment.create({ data });
  },

  findById(id: string) {
    return prisma.payment.findFirst({ where: { id } });
  },

  markReceiptSent(id: string) {
    return prisma.payment.update({
      where: { id },
      data: { receiptSentAt: new Date() },
    });
  },

  sumForInvoice(invoiceId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  },

  listForInvoice(invoiceId: string, sortOrder: 'asc' | 'desc' = 'desc') {
    return prisma.payment.findMany({ where: { invoiceId }, orderBy: { paidAt: sortOrder } });
  },

  findByTransactionReference(transactionReference: string, excludePaymentId?: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.payment.findFirst({
      where: {
        transactionReference,
        ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      },
    });
  },

  findByGatewayTransactionId(gatewayTransactionId: string) {
    return prisma.payment.findFirst({ where: { gatewayTransactionId } });
  },
};
