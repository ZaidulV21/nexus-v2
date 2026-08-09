import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';

export const leadRepository = {
  create(
    data: {
      leadNumber: string;
      contactName: string;
      phone: string;
      email?: string;
      companyName?: string;
      source?: string;
      clientId?: string;
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.lead.create({ data });
  },

  findById(id: string) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        leadServices: { include: { service: true, subServices: { include: { subService: true } } } },
        sourceClient: true,
      },
    });
  },

  update(id: string, data: Partial<{ contactName: string; phone: string; email: string; companyName: string; clientId: string }>, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.lead.update({ where: { id }, data });
  },

  markConverted(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.lead.update({ where: { id }, data: { convertedAt: new Date() } });
  },

  archive(id: string, archivedById: string, reason: string) {
    return prisma.lead.update({
      where: { id },
      data: { archivedAt: new Date(), archivedById, archiveReason: reason },
    });
  },

  restore(id: string) {
    return prisma.lead.update({
      where: { id },
      data: { archivedAt: null, archivedById: null, archiveReason: null },
    });
  },

  async list(pagination: PaginationParams & { archived?: boolean }) {
    const where: any = { deletedAt: null };
    if (pagination.archived !== undefined) {
      where.archivedAt = pagination.archived ? { not: null } : null;
    } else {
      where.archivedAt = null;
    }
    if (pagination.search) {
      where.OR = [
        { leadNumber: { contains: pagination.search, mode: 'insensitive' } },
        { contactName: { contains: pagination.search, mode: 'insensitive' } },
        { phone: { contains: pagination.search, mode: 'insensitive' } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
        { companyName: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
        include: { leadServices: { include: { service: true, subServices: { include: { subService: true } } } } },
      }),
      prisma.lead.count({ where }),
    ]);
    return { items, total };
  },

  async generateLeadNumber(tx: Prisma.TransactionClient): Promise<string> {
    // Next number is derived from the MAX existing number, never the row count:
    // hard-deleted rows create gaps, so a count-based sequence would reuse an
    // existing number and collide on the unique constraint (surfacing as a 500
    // instead of the intended validation error).
    const rows = await tx.$queryRaw<{ maxSeq: number | null }[]>`
      SELECT MAX(CAST(SPLIT_PART("leadNumber", '-', 2) AS INTEGER)) AS "maxSeq" FROM "leads"
    `;
    const next = (rows[0]?.maxSeq ?? 0) + 1;
    return `L-${String(next).padStart(5, '0')}`;
  },
};

export const leadServiceRepository = {
  createMany(
    leadId: string,
    services: Array<{
      serviceId: string;
      subServiceIds?: string[];
      questionnaireVersionId?: string;
      questionnaireAnswers?: any;
    }>,
    tx: Prisma.TransactionClient
  ) {
    return Promise.all(
      services.map((s) =>
        tx.leadService.create({
          data: {
            leadId,
            serviceId: s.serviceId,
            // Junction rows created atomically with their Lead Service.
            subServices: s.subServiceIds?.length
              ? { create: s.subServiceIds.map((subServiceId) => ({ subServiceId })) }
              : undefined,
            questionnaireVersionId: s.questionnaireVersionId,
            questionnaireAnswers: s.questionnaireAnswers,
            status: 'NEW',
          },
        })
      )
    );
  },

  create(
    leadId: string,
    service: {
      serviceId: string;
      subServiceIds?: string[];
      questionnaireVersionId?: string;
      questionnaireAnswers?: any;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.leadService.create({
      data: {
        leadId,
        serviceId: service.serviceId,
        subServices: service.subServiceIds?.length
          ? { create: service.subServiceIds.map((subServiceId) => ({ subServiceId })) }
          : undefined,
        questionnaireVersionId: service.questionnaireVersionId,
        questionnaireAnswers: service.questionnaireAnswers,
        status: 'NEW',
      },
    });
  },

  findById(id: string) {
    return prisma.leadService.findFirst({
      where: { id },
      include: { service: true, subServices: { include: { subService: true } }, lead: true },
    });
  },

  listForLead(leadId: string) {
    return prisma.leadService.findMany({
      where: { leadId },
      include: { service: true, subServices: { include: { subService: true } } },
    });
  },

  // Marks a Lead Service as converted/attached to the Lead's Client. Each
  // service converts exactly once (see convertLeadToClient) - repeat
  // conversions never touch services that already carry a convertedAt.
  markConverted(id: string, convertedAt: Date, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.leadService.update({ where: { id }, data: { convertedAt } });
  },
};

export const leadActivityNoteRepository = {
  create(leadId: string, authorUserId: string, note: string) {
    return prisma.leadActivityNote.create({ data: { leadId, authorUserId, note } });
  },

  listForLead(leadId: string) {
    return prisma.leadActivityNote.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' } });
  },
};
