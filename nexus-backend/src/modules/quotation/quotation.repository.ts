import { prisma } from '../../config/database';
import { Prisma, QuotationStatus } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';

// The only statuses a Client may ever see. DRAFT and APPROVED are internal:
// a quotation becomes visible in the portal exactly when the admin clicks
// "Send" (SENT), and stays visible through the client's own decisions.
// A revision-in-progress flips back to DRAFT and disappears until resent.
export const CLIENT_VISIBLE_QUOTATION_STATUSES: QuotationStatus[] = [
  'SENT',
  'NEGOTIATION',
  'ACCEPTED',
  'REJECTED',
];

// Batch-fetch Service names for items where serviceName is NULL.
// Populates the denormalized field from the catalog at read time for
// backward compatibility with older quotations created before the field
// was populated.
async function enrichItemsWithServiceNames(items: any[]): Promise<any[]> {
  const missing = items.filter((item) => !item.serviceName && item.serviceId);
  if (missing.length === 0) return items;
  const uniqueIds = [...new Set(missing.map((item) => item.serviceId))];
  const services = await prisma.service.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(services.map((s) => [s.id, s.name]));
  return items.map((item) => ({
    ...item,
    serviceName: item.serviceName || nameMap.get(item.serviceId) || null,
  }));
}

// Business-facing summaries of the related Lead / Client. Only these fields
// ever leave the API - never the full records (Client carries passwordHash)
// and never raw UUIDs as the primary display value.
const LEAD_SUMMARY_SELECT = {
  id: true,
  leadNumber: true,
  contactName: true,
  companyName: true,
  email: true,
  phone: true,
} as const;

const CLIENT_SUMMARY_SELECT = {
  id: true,
  clientNumber: true,
  contactName: true,
  companyName: true,
  email: true,
  phone: true,
  sourceLeadId: true,
  sourceLead: { select: { id: true, leadNumber: true, contactName: true } },
} as const;

export const quotationRepository = {
  create(data: { quotationNumber: string; leadId?: string | null; clientId?: string | null }, tx: Prisma.TransactionClient) {
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

  // Lead→Client conversion: migrate all quotations from leadId to clientId.
  // Runs inside the conversion transaction so the link is never broken.
  async migrateLeadQuotationsToClient(leadId: string, clientId: string, tx: Prisma.TransactionClient) {
    return tx.quotation.updateMany({
      where: { leadId },
      data: { leadId: null, clientId },
    });
  },

  countForLead(leadId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.quotation.count({
      where: {
        OR: [
          { leadId },
          { client: { sourceLeadId: leadId } },
        ],
      },
    });
  },

  async findById(id: string) {
    const quotation = await prisma.quotation.findFirst({
      where: { id },
      include: {
        lead: { select: { ...LEAD_SUMMARY_SELECT, client: { select: CLIENT_SUMMARY_SELECT } } },
        client: { select: CLIENT_SUMMARY_SELECT },
        versions: {
          include: {
            items: true,
            approvals: true,
          },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
    if (!quotation) return null;
    // Backward compatibility: fill serviceName for older items where it is NULL
    for (const version of quotation.versions) {
      (version as any).items = await enrichItemsWithServiceNames((version as any).items);
    }
    return quotation;
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
        include: {
          lead: { select: LEAD_SUMMARY_SELECT },
          client: { select: CLIENT_SUMMARY_SELECT },
          versions: {
            where: { isActive: true },
            include: { items: true },
          },
        },
      }),
      prisma.quotation.count({ where }),
    ]);
    // Backward compatibility: fill serviceName for older items
    for (const quotation of items) {
      for (const version of quotation.versions) {
        (version as any).items = await enrichItemsWithServiceNames((version as any).items);
      }
    }
    return { items, total };
  },

  async listForClient(clientId: string, pagination: PaginationParams) {
    // Ownership mirrors getForClient: either a direct clientId link or the
    // quotation's lead converted into this client. Status is restricted to
    // post-send states so drafts and internally-approved quotations never
    // reach the portal.
    const where: any = {
      AND: [
        { OR: [{ clientId }, { lead: { client: { id: clientId } } }] },
        { status: { in: CLIENT_VISIBLE_QUOTATION_STATUSES } },
      ],
    };
    if (pagination.search) {
      where.AND.push({
        OR: [
          { quotationNumber: { contains: pagination.search, mode: 'insensitive' } },
          { lead: { leadNumber: { contains: pagination.search, mode: 'insensitive' } } },
        ],
      });
    }

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
        include: {
          lead: { select: { id: true, leadNumber: true } },
          client: { select: { sourceLead: { select: { id: true, leadNumber: true } } } },
          versions: {
            where: { isActive: true },
            include: { items: true },
          },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    // Backward compatibility: fill serviceName for older items
    for (const quotation of items) {
      for (const version of quotation.versions) {
        (version as any).items = await enrichItemsWithServiceNames((version as any).items);
      }
    }

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
    return prisma.quotationVersion.findFirst({
      where: { id },
      include: { items: true, quotation: true },
    });
  },

  createApproval(
    data: { quotationVersionId: string; approvedByUserId: string; approvalMethod: any },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.quotationApproval.create({ data });
  },
};
