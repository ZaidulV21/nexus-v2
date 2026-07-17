import { prisma } from '../../config/database';
import { Prisma, QuotationStatus } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';

export const quotationRepository = {
  create(data: { quotationNumber: string; leadId: string; clientId?: string }, tx: Prisma.TransactionClient) {
    return tx.quotation.create({ data });
  },

  setActiveVersion(id: string, versionId: string, tx: Prisma.TransactionClient) {
    return tx.quotation.update({ where: { id }, data: { activeVersionId: versionId } });
  },

  // Typed against the generated Prisma enum (not string/any) so writing a
  // status value that doesn't exist in the database enum is a compile
  // error, never a runtime Prisma validation error.
  updateStatus(id: string, status: QuotationStatus, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.quotation.update({ where: { id }, data: { status } });
  },

  findById(id: string) {
    return prisma.quotation.findFirst({
      where: { id },
      include: {
        lead: { include: { client: true } },
        client: true,
        versions: { include: { items: true, approvals: true }, orderBy: { versionNumber: 'desc' } },
      },
    });
  },

  async list(pagination: PaginationParams) {
    const where: any = {};
    if (pagination.search) {
      where.quotationNumber = { contains: pagination.search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
        include: { versions: { where: { isActive: true } } },
      }),
      prisma.quotation.count({ where }),
    ]);
    return { items, total };
  },

  async listForClient(clientId: string, pagination: PaginationParams) {
    const where: any = { clientId };
    if (pagination.search) {
      where.OR = [
        { quotationNumber: { contains: pagination.search, mode: 'insensitive' } },
        { lead: { leadNumber: { contains: pagination.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
        include: {
          lead: { select: { id: true, leadNumber: true } },
          versions: { where: { isActive: true }, include: { items: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return { items, total };
  },

  async generateQuotationNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.quotation.count();
    return `Q-${String(count + 1).padStart(5, '0')}`;
  },
};

export const quotationVersionRepository = {
  deactivateAllForQuotation(quotationId: string, tx: Prisma.TransactionClient) {
    return tx.quotationVersion.updateMany({ where: { quotationId }, data: { isActive: false } });
  },

  create(
    data: {
      quotationId: string;
      versionNumber: number;
      subtotal: number;
      discount: number;
      gstAmount: number;
      transportation: number;
      installation: number;
      grandTotal: number;
      createdByUserId: string;
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.quotationVersion.create({ data });
  },

  createItems(quotationVersionId: string, items: any[], tx: Prisma.TransactionClient) {
    return Promise.all(
      items.map((item) =>
        tx.quotationItem.create({
          data: { ...item, quotationVersionId },
        })
      )
    );
  },

  countVersions(quotationId: string, tx: Prisma.TransactionClient) {
    return tx.quotationVersion.count({ where: { quotationId } });
  },

  findById(id: string) {
    return prisma.quotationVersion.findFirst({ where: { id }, include: { items: true, quotation: true } });
  },

  createApproval(
    data: { quotationVersionId: string; approvedByUserId: string; approvalMethod: any },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.quotationApproval.create({ data });
  },
};
