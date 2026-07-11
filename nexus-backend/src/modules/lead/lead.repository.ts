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
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.lead.create({ data });
  },

  findById(id: string) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { leadServices: { include: { service: true } } },
    });
  },

  update(id: string, data: Partial<{ contactName: string; phone: string; email: string; companyName: string }>) {
    return prisma.lead.update({ where: { id }, data });
  },

  markConverted(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.lead.update({ where: { id }, data: { convertedAt: new Date() } });
  },

  async list(pagination: PaginationParams) {
    const where: any = { deletedAt: null };
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
        include: { leadServices: { include: { service: true } } },
      }),
      prisma.lead.count({ where }),
    ]);
    return { items, total };
  },

  async generateLeadNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.lead.count();
    const next = count + 1;
    return `L-${String(next).padStart(5, '0')}`;
  },
};

export const leadServiceRepository = {
  createMany(
    leadId: string,
    services: Array<{ serviceId: string; questionnaireVersionId?: string; questionnaireAnswers?: any }>,
    tx: Prisma.TransactionClient
  ) {
    return Promise.all(
      services.map((s) =>
        tx.leadService.create({
          data: {
            leadId,
            serviceId: s.serviceId,
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
    service: { serviceId: string; questionnaireVersionId?: string; questionnaireAnswers?: any },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    return client.leadService.create({
      data: {
        leadId,
        serviceId: service.serviceId,
        questionnaireVersionId: service.questionnaireVersionId,
        questionnaireAnswers: service.questionnaireAnswers,
        status: 'NEW',
      },
    });
  },

  findById(id: string) {
    return prisma.leadService.findFirst({ where: { id }, include: { service: true, lead: true } });
  },

  listForLead(leadId: string) {
    return prisma.leadService.findMany({ where: { leadId }, include: { service: true } });
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
