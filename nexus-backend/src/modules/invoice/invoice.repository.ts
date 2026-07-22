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
      where: { clientId },
      include: { items: true, payments: true, client: true, project: true },
    });
  },
};

export const paymentRepository = {
  create(
    data: { invoiceId: string; amount: number; method: string; transactionReference?: string; referenceNote?: string; recordedByUserId: string }
  ) {
    return prisma.payment.create({ data });
  },

  findById(id: string) {
    return prisma.payment.findFirst({ where: { id } });
  },

  sumForInvoice(invoiceId: string) {
    return prisma.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  },

  listForInvoice(invoiceId: string, sortOrder: 'asc' | 'desc' = 'desc') {
    return prisma.payment.findMany({ where: { invoiceId }, orderBy: { paidAt: sortOrder } });
  },

  findByTransactionReference(transactionReference: string, excludePaymentId?: string) {
    return prisma.payment.findFirst({
      where: {
        transactionReference,
        ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      },
    });
  },
};
