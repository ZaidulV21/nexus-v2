import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { runInTransaction } from '../../core/utils/transaction';
import { clientRepository } from './client.repository';
import { leadRepository, leadServiceRepository } from '../lead/lead.repository';
import { quotationRepository } from '../quotation/quotation.repository';
import { prisma } from '../../config/database';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { env } from '../../config/env';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/AppError';

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

export const clientService = {
  // Implements PRD's Lead -> Client conversion: Admin-triggered when the Lead
  // is qualified and ready for quotation workflow. If a Client portal account
  // was already created during the quote wizard, it is reused — no duplicate
  // account is created and no temporary password is generated.
  async convertLeadToClient(leadId: string, actorUserId?: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const leadServices = await leadServiceRepository.listForLead(leadId);
    if (leadServices.length === 0) {
      throw new ValidationError('Lead must have at least one service before it can be converted to a Client');
    }

    // Business validation: Lead should be qualified (past initial contact stages)
    // but does NOT require approved quotations. Quotations belong to Clients.
    const hasQualifiedService = leadServices.some((ls) =>
      !['NEW', 'CONTACTED'].includes(ls.status)
    );
    if (!hasQualifiedService) {
      throw new ValidationError(
        'Lead must be qualified (at least one service past initial contact stage) before conversion'
      );
    }

    if (!lead.email) {
      throw new ValidationError('Lead must have an email address on file to create a Client login');
    }

    // Check if a Client portal account was already created during the quote wizard.
    const existingClient = await clientRepository.findBySourceLeadId(leadId);
    if (existingClient) {
      // Client already exists — reuse it. Migrate any Lead quotations and
      // send the Welcome Email without creating a duplicate account.
      const migration = await quotationRepository.migrateLeadQuotationsToClient(lead.id, existingClient.id, prisma);

      if (!lead.convertedAt) {
        await leadRepository.markConverted(lead.id);
      }

      await timelineService.recordEvent({
        entityType: 'LEAD',
        entityId: lead.id,
        eventType: 'CLIENT_ACCOUNT_CREATED',
        description: `Existing Client account reused for ${existingClient.contactName}`,
        actorUserId,
      });

      await timelineService.recordEvent({
        entityType: 'CLIENT',
        entityId: existingClient.id,
        eventType: 'QUOTATIONS_MIGRATED',
        description: `${migration.count} quotation(s) migrated from Lead ${lead.leadNumber} to Client ${existingClient.clientNumber}`,
        actorUserId,
        metadata: { sourceLeadId: lead.id, sourceLeadNumber: lead.leadNumber, migratedQuotations: migration.count },
      });

      await auditService.recordAudit({
        entityType: 'CLIENT',
        entityId: existingClient.id,
        action: 'CREATE',
        afterState: { clientId: existingClient.id, sourceLeadId: lead.id, reused: true },
        actorUserId,
      });

      await auditService.recordAudit({
        entityType: 'CLIENT',
        entityId: existingClient.id,
        action: 'QUOTATIONS_MIGRATED',
        beforeState: { leadId: lead.id, leadNumber: lead.leadNumber },
        afterState: { clientId: existingClient.id, clientNumber: existingClient.clientNumber, migratedQuotations: migration.count },
        actorUserId,
      });

      await notificationsService.emitEvent({
        eventType: 'client.account.created',
        entityType: 'CLIENT',
        entityId: existingClient.id,
        recipient: existingClient.email,
        payload: { clientName: existingClient.contactName, loginEmail: existingClient.email, clientId: existingClient.id },
      });

      return existingClient;
    }

    // No pre-existing Client — create a new account with a temporary password.
    const existingEmailClient = await clientRepository.findByEmail(lead.email);
    if (existingEmailClient) {
      throw new ConflictError('A client account already exists for this email address');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, env.bcryptSaltRounds);

    let client;
    let migratedQuotations = 0;
    try {
      const txResult = await runInTransaction(async (tx) => {
        const clientNumber = await clientRepository.generateClientNumber(tx);
        const created = await clientRepository.create(
          {
            clientNumber,
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

        // Migrate all Lead quotations to the newly-created Client. Quotations
        // start with leadId; after conversion, they carry clientId instead.
        const migration = await quotationRepository.migrateLeadQuotationsToClient(lead.id, created.id, tx);

        return { created, migratedCount: migration.count };
      });
      client = txResult.created;
      migratedQuotations = txResult.migratedCount;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('A client account already exists for this email address');
      }
      throw error;
    }

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: lead.id,
      eventType: 'CLIENT_ACCOUNT_CREATED',
      description: `Client account created for ${client.contactName}`,
      actorUserId,
    });

    await timelineService.recordEvent({
      entityType: 'CLIENT',
      entityId: client.id,
      eventType: 'QUOTATIONS_MIGRATED',
      description: `${migratedQuotations} quotation(s) migrated from Lead ${lead.leadNumber} to Client ${client.clientNumber}`,
      actorUserId,
      metadata: { sourceLeadId: lead.id, sourceLeadNumber: lead.leadNumber, migratedQuotations },
    });

    await auditService.recordAudit({
      entityType: 'CLIENT',
      entityId: client.id,
      action: 'CREATE',
      afterState: { clientId: client.id, sourceLeadId: lead.id },
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'CLIENT',
      entityId: client.id,
      action: 'QUOTATIONS_MIGRATED',
      beforeState: { leadId: lead.id, leadNumber: lead.leadNumber },
      afterState: { clientId: client.id, clientNumber: client.clientNumber, migratedQuotations },
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'client.account.created',
      entityType: 'CLIENT',
      entityId: client.id,
      recipient: client.email,
      payload: { clientName: client.contactName, loginEmail: client.email, clientId: client.id },
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
