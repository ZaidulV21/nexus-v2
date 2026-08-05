import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { runInTransaction } from '../../core/utils/transaction';
import { clientRepository } from './client.repository';
import { leadRepository, leadServiceRepository } from '../lead/lead.repository';
import { quotationRepository } from '../quotation/quotation.repository';
import { authRepository } from '../auth/auth.repository';
import { emailService } from '../email/email.service';
import { companyService } from '../company/company.service';
import { renderClientWelcomeEmail } from '../email/templates/client-welcome.template';
import { renderPasswordResetEmail } from '../email/templates/password-reset.template';
import { renderSetPasswordEmail } from '../email/templates/set-password.template';
import type { EmailBranding } from '../email/templates/base-email.template';
import { prisma } from '../../config/database';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { env } from '../../config/env';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors/AppError';

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

function hashToken(token: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(token).digest('hex');
}

async function generateResetToken(email: string): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHashVal = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { email } });
  await prisma.passwordResetToken.create({
    data: { email, tokenHash: tokenHashVal, expiresAt },
  });

  return rawToken;
}

async function getBranding(): Promise<EmailBranding> {
  try {
    const settings = await companyService.get();
    return {
      companyName: settings.companyName ?? undefined,
      logoUrl: settings.logoUrl ?? undefined,
      supportEmail: settings.supportEmail ?? undefined,
      phone: settings.phone ?? undefined,
      addressLine1: settings.addressLine1 ?? undefined,
      addressLine2: settings.addressLine2 ?? undefined,
      city: settings.city ?? undefined,
      state: settings.state ?? undefined,
      country: settings.country ?? undefined,
      pincode: settings.pincode ?? undefined,
    };
  } catch {
    return {};
  }
}

export const clientService = {
  // Implements PRD's Lead -> Client conversion as TWO independent operations:
  //
  //   1. Client creation - happens ONLY on the first conversion of a Lead.
  //   2. Service attachment - every qualified service is attached to the
  //      Lead's Client exactly once (each LeadService carries its own
  //      convertedAt). Later conversions attach the remaining services to the
  //      SAME Client - never a new Client, never a reset, never a rewrite of
  //      existing Service History. Only ever append.
  //
  // This makes conversion repeatable for multi-service Leads:
  //   Lead [Solar, Website, Interior]
  //     -> Convert Solar  -> Client created, Solar attached
  //     -> Convert Website-> Website attached to existing Client
  //     -> Convert Interior -> Interior attached to existing Client
  //
  // A Client portal account already created during the quote wizard is reused -
  // no duplicate account, no duplicate contact, no duplicate company, no
  // temporary password regeneration. If a Client already exists for this Lead
  // nothing is re-created; only the not-yet-attached qualified services are
  // appended.
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

    // Resolve the Client this Lead belongs to, if one already exists. Two valid
    // relationships: a Client that submitted a repeat enquiry (lead.clientId),
    // or a Client created from this Lead on an earlier conversion
    // (client.sourceLeadId). No Client => this is the first conversion.
    let existingClient = null;
    if (lead.clientId) {
      existingClient = await clientRepository.findById(lead.clientId);
    }
    if (!existingClient) {
      existingClient = await clientRepository.findBySourceLeadId(leadId);
    }

    // Only qualified services that have not yet been attached are processed by
    // this call. Repeat conversions skip every already-attached service, so the
    // existing Client (account, contacts, company, history, quotations) is
    // never re-created, reset, duplicated, or overwritten.
    const servicesToAttach = leadServices.filter(
      (ls) => !['NEW', 'CONTACTED'].includes(ls.status) && !ls.convertedAt
    );

    // The conversion milestone (Lead.convertedAt) is only ever recorded once.
    const isFirstConversion = !lead.convertedAt;
    const convertedAt = new Date();

    // ── Operation 1: Client creation (first conversion only) ────────────────
    if (!existingClient) {
      const existingEmailClient = await clientRepository.findByEmail(lead.email);
      if (existingEmailClient) {
        throw new ConflictError('A client account already exists for this email address');
      }

      const passwordHash = await bcrypt.hash(randomBytes(12).toString('hex'), env.bcryptSaltRounds);

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

          // First conversion milestone is set together with the Client write so
          // the two can never diverge.
          if (isFirstConversion) {
            await leadRepository.markConverted(lead.id, tx);
          }

          // Attach every qualified service inside the same transaction.
          for (const ls of servicesToAttach) {
            await leadServiceRepository.markConverted(ls.id, convertedAt, tx);
          }

          // Migrate all Lead quotations to the newly-created Client. Quotations
          // start with leadId; after conversion they carry clientId instead.
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

      // Timeline - conversion milestone (LEAD) + account creation (CLIENT).
      await timelineService.recordEvent({
        entityType: 'LEAD',
        entityId: lead.id,
        eventType: 'LEAD_CONVERTED',
        description: `Lead ${lead.leadNumber} converted to Client ${client.clientNumber}`,
        actorUserId,
        metadata: { clientId: client.id },
      });

      await timelineService.recordEvent({
        entityType: 'CLIENT',
        entityId: client.id,
        eventType: 'CLIENT_ACCOUNT_CREATED',
        description: `Client account created for ${client.contactName}`,
        actorUserId,
      });

      // Audit - Client Created + conversion milestone, with actor + timestamp.
      await auditService.recordAudit({
        entityType: 'LEAD',
        entityId: lead.id,
        action: 'CONVERT',
        actorUserId,
        afterState: { clientId: client.id, convertedAt },
      });

      await auditService.recordAudit({
        entityType: 'CLIENT',
        entityId: client.id,
        action: 'CREATE',
        afterState: { clientId: client.id, sourceLeadId: lead.id },
        actorUserId,
      });

      // Only surface the quotation migration when quotations actually moved
      // over - a "0 quotation(s) migrated" entry is noise, not a milestone.
      if (migratedQuotations > 0) {
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
          action: 'QUOTATIONS_MIGRATED',
          beforeState: { leadId: lead.id, leadNumber: lead.leadNumber },
          afterState: { clientId: client.id, clientNumber: client.clientNumber, migratedQuotations },
          actorUserId,
        });
      }

      // Generate a password-setup token and send a "Set Your Password" email.
      // The client was created without a known password - the user sets it via
      // the existing reset-password page, reusing the forgot-password infrastructure.
      const resetToken = await generateResetToken(client.email);
      const branding = await getBranding();
      const appUrl = env.appUrl || 'http://localhost:5173';
      const setupUrl = `${appUrl}/reset-password?token=${resetToken}`;

      const html = renderSetPasswordEmail(
        { clientName: client.contactName, loginEmail: client.email, setupUrl, expiryMinutes: 60 },
        branding
      );
      await emailService.send({
        to: client.email,
        subject: `Set your password for ${branding.companyName || 'Nexus'} Client Portal`,
        html,
        replyTo: branding.supportEmail || undefined,
      });

      // Notification - New Client Created (first conversion only).
      await notificationsService.emitEvent({
        eventType: 'client.account.created',
        entityType: 'CLIENT',
        entityId: client.id,
        recipient: client.email,
        payload: { clientName: client.contactName, loginEmail: client.email, clientId: client.id, tempPassword: true },
      });

      // ── Operation 2: Service attachment ────────────────────────────────
      // (DB rows were already marked inside the creation transaction.)
      await this.recordServiceAttachments(client, lead, servicesToAttach, actorUserId, isFirstConversion);

      return client;
    }

    // ── Existing Client → attach services (later conversions) ───────────────
    // No new Client, no password reset, no welcome email. Only append services.
    if (servicesToAttach.length === 0) {
      // Idempotent repeat conversion - nothing new to attach.
      return existingClient;
    }

    // Re-link any pre-conversion quotations (idempotent - only unlinked rows).
    const migration = await quotationRepository.migrateLeadQuotationsToClient(lead.id, existingClient.id, prisma);

    // Only surface the migration when quotations actually moved over.
    if (migration.count > 0) {
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
        action: 'QUOTATIONS_MIGRATED',
        beforeState: { leadId: lead.id, leadNumber: lead.leadNumber },
        afterState: { clientId: existingClient.id, clientNumber: existingClient.clientNumber, migratedQuotations: migration.count },
        actorUserId,
      });
    }

    if (isFirstConversion) {
      // First admin conversion where the portal account was already created by
      // the quote wizard: record the one-time conversion milestone on the Lead
      // and notify as a newly-available Client account.
      await leadRepository.markConverted(lead.id);

      await timelineService.recordEvent({
        entityType: 'LEAD',
        entityId: lead.id,
        eventType: 'LEAD_CONVERTED',
        description: `Lead ${lead.leadNumber} converted to Client ${existingClient.clientNumber}`,
        actorUserId,
        metadata: { clientId: existingClient.id },
      });

      await auditService.recordAudit({
        entityType: 'LEAD',
        entityId: lead.id,
        action: 'CONVERT',
        actorUserId,
        afterState: { clientId: existingClient.id, convertedAt },
      });

      await notificationsService.emitEvent({
        eventType: 'client.account.created',
        entityType: 'CLIENT',
        entityId: existingClient.id,
        recipient: existingClient.email,
        payload: { clientName: existingClient.contactName, loginEmail: existingClient.email, clientId: existingClient.id },
      });
    }

    // Mark the newly-attached services (idempotent - already-attached services
    // were filtered out above, so this only ever appends).
    await runInTransaction(async (tx) => {
      for (const ls of servicesToAttach) {
        await leadServiceRepository.markConverted(ls.id, convertedAt, tx);
      }
    });

    // ── Operation 2: Service attachment ──────────────────────────────────
    await this.recordServiceAttachments(existingClient, lead, servicesToAttach, actorUserId, isFirstConversion);

    return existingClient;
  },

  // Records the per-service trail for an attachment: Timeline entry, Audit
  // entry (Service Attached, Converted By, timestamp), and - on LATER
  // conversions only - a "New Service added to Client" notification. First
  // conversions are covered by the "New Client Created" notification instead.
  async recordServiceAttachments(
    client: { id: string; clientNumber: string; email: string; contactName: string },
    lead: { id: string; leadNumber: string },
    services: Array<{ id: string; serviceId: string; convertedAt: Date | null; service?: { name?: string | null } | null }>,
    actorUserId: string | undefined,
    isFirstConversion: boolean
  ) {
    for (const ls of services) {
      const serviceName = ls.service?.name ?? 'Service';

      await timelineService.recordEvent({
        entityType: 'CLIENT',
        entityId: client.id,
        eventType: 'SERVICE_ATTACHED',
        description: `Service "${serviceName}" added to Client ${client.clientNumber}`,
        actorUserId,
        metadata: { serviceId: ls.serviceId, leadServiceId: ls.id, sourceLeadId: lead.id, sourceLeadNumber: lead.leadNumber },
      });

      await auditService.recordAudit({
        entityType: 'CLIENT',
        entityId: client.id,
        action: 'SERVICE_ATTACHED',
        actorUserId,
        beforeState: { serviceId: ls.serviceId, convertedAt: null },
        afterState: { serviceId: ls.serviceId, serviceName, convertedAt: ls.convertedAt },
      });

      if (!isFirstConversion) {
        await notificationsService.emitEvent({
          eventType: 'client.service.added',
          entityType: 'CLIENT',
          entityId: client.id,
          recipient: client.email,
          payload: {
            clientId: client.id,
            clientName: client.contactName,
            serviceId: ls.serviceId,
            serviceName,
          },
          sendEmail: false,
        });
      }
    }
  },

  async getById(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError('Client not found');
    return client;
  },

  async getSummary(id: string) {
    const summary = await clientRepository.getSummary(id);
    if (!summary) throw new NotFoundError('Client not found');
    return summary;
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

  async listLeads(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError('Client not found');
    return clientRepository.listLeads(id);
  },

  async getServices(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError('Client not found');
    return (await clientRepository.listServices(id)) ?? [];
  },

  async list(pagination: any) {
    return clientRepository.list(pagination);
  },

  async resetPassword(id: string, actorUserId?: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError('Client not found');

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, env.bcryptSaltRounds);
    await authRepository.updateClientPassword(id, passwordHash);

    const branding = await getBranding();
    const appUrl = env.appUrl || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${await generateResetToken(client.email)}`;

    const html = renderPasswordResetEmail(
      { clientName: client.contactName, resetUrl, expiryMinutes: 60 },
      branding
    );
    await emailService.send({
      to: client.email,
      subject: 'Your password has been reset',
      html,
      replyTo: branding.supportEmail || undefined,
    });

    await timelineService.recordEvent({
      entityType: 'CLIENT',
      entityId: id,
      eventType: 'CLIENT_UPDATED',
      description: 'Admin reset client password',
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'CLIENT',
      entityId: id,
      action: 'UPDATE',
      afterState: { field: 'password', action: 'admin_reset' },
      actorUserId,
    });

    return { success: true };
  },

  async sendWelcomeEmail(id: string, actorUserId?: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError('Client not found');

    const branding = await getBranding();
    const appUrl = env.appUrl || 'http://localhost:5173';
    const portalUrl = `${appUrl}/login`;

    const html = renderClientWelcomeEmail(
      { clientName: client.contactName, loginEmail: client.email, portalUrl },
      branding
    );
    await emailService.send({
      to: client.email,
      subject: `Welcome to ${branding.companyName || 'Nexus'} Client Portal`,
      html,
      replyTo: branding.supportEmail || undefined,
    });

    await timelineService.recordEvent({
      entityType: 'CLIENT',
      entityId: id,
      eventType: 'CLIENT_UPDATED',
      description: 'Welcome email sent to client',
      actorUserId,
    });

    return { success: true };
  },

  async toggleActive(id: string, isActive: boolean, actorUserId?: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new NotFoundError('Client not found');
    if (client.isActive === isActive) {
      throw new ValidationError(`Client account is already ${isActive ? 'active' : 'inactive'}`);
    }

    const updated = await clientRepository.updateAccountStatus(id, isActive);

    await timelineService.recordEvent({
      entityType: 'CLIENT',
      entityId: id,
      eventType: isActive ? 'CLIENT_RESTORED' : 'CLIENT_UPDATED',
      description: isActive ? 'Client account activated' : 'Client account deactivated',
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'CLIENT',
      entityId: id,
      action: 'UPDATE',
      beforeState: { isActive: client.isActive },
      afterState: { isActive },
      actorUserId,
    });

    return updated;
  },
};
