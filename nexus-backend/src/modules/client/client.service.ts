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

    // Check if this Lead is linked to an existing Client (repeat enquiry).
    // This is checked first — a Lead with clientId was created by an existing
    // client submitting a new enquiry via the Quote Wizard.
    if (lead.clientId) {
      const linkedClient = await clientRepository.findById(lead.clientId);
      if (linkedClient) {
        const migration = await quotationRepository.migrateLeadQuotationsToClient(lead.id, linkedClient.id, prisma);

        if (!lead.convertedAt) {
          await leadRepository.markConverted(lead.id);
        }

        await timelineService.recordEvent({
          entityType: 'LEAD',
          entityId: lead.id,
          eventType: 'CLIENT_ACCOUNT_CREATED',
          description: `Existing Client account reused for ${linkedClient.contactName}`,
          actorUserId,
        });

        await timelineService.recordEvent({
          entityType: 'CLIENT',
          entityId: linkedClient.id,
          eventType: 'QUOTATIONS_MIGRATED',
          description: `${migration.count} quotation(s) migrated from Lead ${lead.leadNumber} to Client ${linkedClient.clientNumber}`,
          actorUserId,
          metadata: { sourceLeadId: lead.id, sourceLeadNumber: lead.leadNumber, migratedQuotations: migration.count },
        });

        await auditService.recordAudit({
          entityType: 'CLIENT',
          entityId: linkedClient.id,
          action: 'CREATE',
          afterState: { clientId: linkedClient.id, sourceLeadId: lead.id, reused: true },
          actorUserId,
        });

        await auditService.recordAudit({
          entityType: 'CLIENT',
          entityId: linkedClient.id,
          action: 'QUOTATIONS_MIGRATED',
          beforeState: { leadId: lead.id, leadNumber: lead.leadNumber },
          afterState: { clientId: linkedClient.id, clientNumber: linkedClient.clientNumber, migratedQuotations: migration.count },
          actorUserId,
        });

        await notificationsService.emitEvent({
          eventType: 'client.account.created',
          entityType: 'CLIENT',
          entityId: linkedClient.id,
          recipient: linkedClient.email,
          payload: { clientName: linkedClient.contactName, loginEmail: linkedClient.email, clientId: linkedClient.id },
        });

        return linkedClient;
      }
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

    // No pre-existing Client — create a new account and send a "Set Your Password" link.
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

    // Generate a password-setup token and send a "Set Your Password" email.
    // The client was created without a known password — the user sets it via
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

    await notificationsService.emitEvent({
      eventType: 'client.account.created',
      entityType: 'CLIENT',
      entityId: client.id,
      recipient: client.email,
      payload: { clientName: client.contactName, loginEmail: client.email, clientId: client.id, tempPassword: true },
    });

    return client;
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
