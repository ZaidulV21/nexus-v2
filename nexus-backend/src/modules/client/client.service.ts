import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { runInTransaction } from '../../core/utils/transaction';
import { clientRepository } from './client.repository';
import { leadRepository, leadServiceRepository } from '../lead/lead.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { env } from '../../config/env';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/AppError';

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

export const clientService = {
  // Implements PRD's Lead -> Client conversion exactly: Admin-triggered,
  // requires at least one approved Lead Service, generates credentials,
  // emails them, and links the Lead for future Project creation.
  async convertLeadToClient(leadId: string, actorUserId?: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const existingClient = await clientRepository.findBySourceLeadId(leadId);
    if (existingClient) {
      throw new ConflictError('This Lead has already been converted to a Client');
    }

    const leadServices = await leadServiceRepository.listForLead(leadId);
    const hasApprovedService = leadServices.some((ls) =>
      ['APPROVED', 'PROJECT CREATED', 'IN PROGRESS', 'ON HOLD', 'COMPLETED', 'CLOSED', 'ARCHIVED'].includes(ls.status)
    );
    if (!hasApprovedService) {
      throw new ValidationError(
        'Lead must have at least one approved service before it can be converted to a Client'
      );
    }

    if (!lead.email) {
      throw new ValidationError('Lead must have an email address on file to create a Client login');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, env.bcryptSaltRounds);

    const client = await runInTransaction(async (tx) => {
      const created = await clientRepository.create(
        {
          companyName: lead.companyName ?? undefined,
          contactName: lead.contactName,
          phone: lead.phone,
          email: lead.email as string,
          passwordHash,
          sourceLeadId: lead.id,
        },
        tx
      );
      await leadRepository.markConverted(lead.id, tx);
      return created;
    });

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: lead.id,
      eventType: 'CLIENT_ACCOUNT_CREATED',
      description: `Client account created for ${client.contactName}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'CLIENT',
      entityId: client.id,
      action: 'CREATE',
      afterState: { clientId: client.id, sourceLeadId: lead.id },
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'client.account.created',
      entityType: 'CLIENT',
      entityId: client.id,
      recipient: client.email,
      payload: { tempPassword, loginEmail: client.email },
    });

    return client;
  },

  async getById(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError('Client not found');
    return client;
  },

  async update(id: string, data: Partial<{ companyName: string; contactName: string; phone: string }>, actorUserId?: string) {
    const existing = await clientRepository.findById(id);
    if (!existing) throw new NotFoundError('Client not found');
    const updated = await clientRepository.update(id, data);

    await timelineService.recordEvent({
      entityType: 'CLIENT',
      entityId: id,
      eventType: 'CLIENT_UPDATED',
      description: 'Client profile updated',
      actorUserId,
    });

    return updated;
  },

  async list(pagination: any) {
    return clientRepository.list(pagination);
  },
};
