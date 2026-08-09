import bcrypt from 'bcrypt';
import { runInTransaction } from '../../core/utils/transaction';
import { leadRepository, leadServiceRepository, leadActivityNoteRepository } from './lead.repository';
import { clientRepository } from '../client/client.repository';
import { serviceRepository } from '../catalog/service.repository';
import { subServiceRepository } from '../catalog/subService.repository';
import { otpService } from '../otp/otp.service';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { statusEngineService } from '../status-engine/statusEngine.service';
import { CreateLeadInput, AddServiceToLeadInput, UpdateLeadServiceStatusInput, ArchiveLeadInput } from './lead.types';
import { computeLeadAggregateStatus, LeadServiceLike } from './lead.aggregateStatus';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { env } from '../../config/env';

function attachLeadAggregateStatus<T extends { leadServices: LeadServiceLike[] }>(entity: T): T & { aggregateStatus: string } {
  return { ...entity, aggregateStatus: computeLeadAggregateStatus(entity.leadServices) };
}

// Validates the Sub Services pinned on a Lead Service and returns the ids to
// store (empty when none were provided). Each Sub Service must exist, be
// publicly selectable and belong to the SAME service it is attached to - a
// Lead Service never carries a sub-service that contradicts its parent
// service. Duplicate ids are silently collapsed (the junction table's unique
// (leadServiceId, subServiceId) constraint enforces this at rest too).
async function resolveSubServiceIds(
  subServiceIds: string[] | undefined,
  serviceId: string
): Promise<string[]> {
  if (!subServiceIds || subServiceIds.length === 0) return [];
  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const id of subServiceIds) {
    if (!seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }
  for (const subServiceId of uniqueIds) {
    const sub = await subServiceRepository.findById(subServiceId);
    if (!sub || !sub.isActive || sub.archivedAt || sub.deletedAt) {
      throw new ValidationError(`Sub Service ${subServiceId} is not available`);
    }
    if (sub.serviceId !== serviceId) {
      throw new ValidationError('The selected Sub Service does not belong to the selected Service');
    }
  }
  return uniqueIds;
}

export const leadService = {
  // Atomic multi-service intake: either the whole enquiry is recorded, or
  // none of it is. Each Lead Service snapshots the questionnaire version
  // active at submission time.
  //
  // When a password is provided (quote wizard flow), the email must have
  // been verified via OTP and a Client portal account is created alongside
  // the Lead in the same transaction.
  async createLead(input: CreateLeadInput) {
    if (input.password && input.email) {
      const isVerified = await otpService.isEmailVerified(input.email);
      if (!isVerified) {
        throw new ValidationError('Email verification is required. Please verify your email before submitting.');
      }
    }

    // When clientId is provided, verify the existing Client exists
    let existingClient = null;
    if (input.clientId) {
      existingClient = await clientRepository.findById(input.clientId);
      if (!existingClient) {
        throw new ValidationError('Referenced client account not found');
      }
    }

    const result = await runInTransaction(async (tx) => {
      const leadNumber = await leadRepository.generateLeadNumber(tx);

      const lead = await leadRepository.create(
        {
          leadNumber,
          contactName: input.contactName,
          phone: input.phone,
          email: input.email,
          companyName: input.companyName,
          source: input.source || 'WEBSITE',
          clientId: input.clientId || undefined,
        },
        tx
      );

      const serviceRecords = [];
      for (const s of input.services) {
        const service = await serviceRepository.findById(s.serviceId);
        if (!service || !service.isActive || service.archivedAt) {
          throw new ValidationError(`Service ${s.serviceId} is not available`);
        }
        const questionnaire = await serviceRepository.getActiveQuestionnaire(s.serviceId);
        const subServiceIds = await resolveSubServiceIds(s.subServiceIds, s.serviceId);
        serviceRecords.push({
          serviceId: s.serviceId,
          subServiceIds,
          questionnaireVersionId: questionnaire?.id,
          questionnaireAnswers: s.questionnaireAnswers,
        });
      }

      const leadServices = await leadServiceRepository.createMany(lead.id, serviceRecords, tx);

      // When clientId is provided (repeat enquiry from existing client), link
      // the Lead to the existing Client. No new Client account is created.
      // When password is provided without clientId (new user wizard flow),
      // create a Client portal account linked to this Lead.
      let client = existingClient;
      if (!input.clientId && input.password && input.email) {
        const duplicateClient = await clientRepository.findByEmail(input.email);
        if (duplicateClient) {
          throw new ValidationError('An account already exists for this email address');
        }

        // A client account is uniquely identified by email OR phone. If the
        // submitted phone already belongs to an account (even under a different
        // email), creating another Client would silently duplicate the same
        // person - reject instead and let the wizard send them through the
        // Welcome Back verification flow.
        const duplicatePhoneClient = input.phone ? await clientRepository.findByPhone(input.phone) : null;
        if (duplicatePhoneClient) {
          throw new ValidationError('An account already exists for this phone number');
        }

        const passwordHash = await bcrypt.hash(input.password, env.bcryptSaltRounds);
        const clientNumber = await clientRepository.generateClientNumber(tx);
        client = await clientRepository.create(
          {
            clientNumber,
            companyName: input.companyName ?? undefined,
            contactName: input.contactName,
            phone: input.phone,
            email: input.email,
            passwordHash,
            sourceLeadId: lead.id,
          },
          tx
        );

        // Link the newly-created Client back to its originating Lead so the
        // Client master profile and the service-request Lead are connected in
        // both directions (Lead.clientId + Client.sourceLeadId). This mirrors
        // the returning-client link (lead.clientId = existingClient.id) and
        // keeps Service History resolution uniform across first-time and
        // returning requests. The Lead's submitted values are NEVER copied
        // back into the Client - the Client was just created from them.
        await leadRepository.update(lead.id, { clientId: client.id }, tx);
      }

      return { lead, leadServices, client };
    });

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: result.lead.id,
      eventType: 'LEAD_CREATED',
      description: `Lead ${result.lead.leadNumber} created with ${result.leadServices.length} service(s)`,
      metadata: { serviceCount: result.leadServices.length },
    });

    await auditService.recordAudit({
      entityType: 'LEAD',
      entityId: result.lead.id,
      action: 'CREATE',
      afterState: { lead: result.lead, leadServices: result.leadServices },
    });

    if (result.lead.email) {
      await notificationsService.emitEvent({
        eventType: 'lead.created',
        entityType: 'LEAD',
        entityId: result.lead.id,
        recipient: result.lead.email,
        payload: { leadNumber: result.lead.leadNumber },
      });
    }

    return result;
  },

  async getById(id: string) {
    const lead = await leadRepository.findById(id);
    if (!lead) throw new NotFoundError('Lead not found');
    return attachLeadAggregateStatus(lead);
  },

  async update(id: string, data: Partial<{ contactName: string; phone: string; email: string; companyName: string }>, actorUserId?: string) {
    const existing = await leadRepository.findById(id);
    if (!existing) throw new NotFoundError('Lead not found');
    const updated = await leadRepository.update(id, data);

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: id,
      eventType: 'LEAD_UPDATED',
      description: 'Lead contact details updated',
      actorUserId,
    });

    return updated;
  },

  async list(pagination: any) {
    const result = await leadRepository.list(pagination);
    return {
      ...result,
      items: result.items.map(attachLeadAggregateStatus),
    };
  },

  // Admin-only: add a service to a Lead that has not yet converted.
  async addServiceToLead(leadId: string, input: AddServiceToLeadInput, actorUserId?: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');
    if (lead.convertedAt) {
      throw new ValidationError('Cannot add a service to a Lead that has already converted to a Project - use the Project Service endpoint instead');
    }

    const service = await serviceRepository.findById(input.serviceId);
    if (!service || !service.isActive || service.archivedAt) throw new ValidationError('Service is not available');

    const questionnaire = await serviceRepository.getActiveQuestionnaire(input.serviceId);
    const subServiceIds = await resolveSubServiceIds(input.subServiceIds, input.serviceId);

    const leadService = await leadServiceRepository.create(leadId, {
      serviceId: input.serviceId,
      subServiceIds,
      questionnaireVersionId: questionnaire?.id,
      questionnaireAnswers: input.questionnaireAnswers,
    });

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: leadId,
      eventType: 'SERVICE_ADDED',
      description: `Service "${service.name}" added to Lead ${lead.leadNumber}`,
      actorUserId,
    });

    return leadService;
  },

  async updateLeadServiceStatus(leadServiceId: string, input: UpdateLeadServiceStatusInput, actorUserId?: string) {
    const leadServiceRecord = await leadServiceRepository.findById(leadServiceId);
    if (!leadServiceRecord) throw new NotFoundError('Lead Service not found');

    // Each LeadService is independent. A service that has been handed off
    // to project execution (PROJECT CREATED) is read-only - its status is
    // managed by the Project workflow. Other services on the same Lead
    // remain fully editable regardless of whether the Lead has a Client
    // account (convertedAt) or other services have been converted.
    if (leadServiceRecord.status === 'PROJECT CREATED') {
      throw new ValidationError(
        'This service has moved to project execution - update its Project Service instead.'
      );
    }

    await statusEngineService.transition({
      entityType: 'LEAD_SERVICE',
      entityId: leadServiceId,
      fromStatus: leadServiceRecord.status,
      toStatus: input.toStatus,
      actorUserId,
      reason: input.reason,
    });

    return leadServiceRepository.findById(leadServiceId);
  },

  // Called by quotation/project workflow events (send, reject, revision
  // request, accept, project creation) - never by a request handler. Moves
  // the Lead Services covered by the quotation to the given automatic
  // status (QUOTE SENT, NEGOTIATION, APPROVED, PROJECT CREATED) through the
  // Status Engine, so every automatic transition is validated, logged to
  // the Timeline, and recorded in the transition log exactly like a manual
  // one.
  //
  // Services already at (or past) the target are skipped rather than
  // erroring: the quotation event must never fail because one Lead Service
  // is ahead of the pipeline (e.g. a resend when it is already QUOTE SENT).
  //
  // options.onlyFromStatus narrows the move to services currently at that
  // exact stage - used by first-quotation creation, which advances only
  // QUOTE PREPARING services to QUOTE SENT and leaves earlier stages alone.
  async applyQuotationWorkflowStatus(
    leadId: string,
    serviceIds: string[] | null,
    toStatus: 'QUOTE SENT' | 'NEGOTIATION' | 'APPROVED' | 'PROJECT CREATED',
    actorUserId?: string,
    options?: { onlyFromStatus?: string }
  ) {
    const leadServices = await leadServiceRepository.listForLead(leadId);
    const serviceIdSet = serviceIds ? new Set(serviceIds) : null;

    for (const record of leadServices) {
      if (serviceIdSet && !serviceIdSet.has(record.serviceId)) continue;
      if (record.status === toStatus) continue;
      if (options?.onlyFromStatus && record.status !== options.onlyFromStatus) continue;

      try {
        await statusEngineService.transition({
          entityType: 'LEAD_SERVICE',
          entityId: record.id,
          fromStatus: record.status,
          toStatus,
          actorUserId,
          isAutomatic: true,
        });
      } catch (err) {
        // A Lead Service that can't legally make this move (e.g. already
        // PROJECT CREATED when a quotation is re-sent) is left untouched -
        // the workflow event that triggered us must still succeed.
        if (!(err instanceof ValidationError)) throw err;
      }
    }
  },

  async addNote(leadId: string, authorUserId: string, note: string) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const created = await leadActivityNoteRepository.create(leadId, authorUserId, note);

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: leadId,
      eventType: 'NOTE_ADDED',
      description: 'Call/follow-up note logged',
      actorUserId: authorUserId,
    });

    return created;
  },

  async listNotes(leadId: string) {
    return leadActivityNoteRepository.listForLead(leadId);
  },

  async archive(id: string, input: ArchiveLeadInput, actorUserId: string) {
    const lead = await leadRepository.findById(id);
    if (!lead) throw new NotFoundError('Lead not found');
    if (lead.archivedAt) {
      throw new ValidationError('Lead is already archived');
    }
    if (lead.convertedAt) {
      throw new ValidationError('Cannot archive a Lead that has been converted to a Client');
    }

    const beforeState = { archivedAt: lead.archivedAt, archivedById: lead.archivedById, archiveReason: lead.archiveReason };
    const updated = await leadRepository.archive(id, actorUserId, input.reason);

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: id,
      eventType: 'LEAD_ARCHIVED',
      description: `Lead ${lead.leadNumber} archived: ${input.reason}`,
      actorUserId,
      metadata: { reason: input.reason },
    });

    await auditService.recordAudit({
      entityType: 'LEAD',
      entityId: id,
      action: 'ARCHIVE',
      actorUserId,
      beforeState,
      afterState: { archivedAt: updated.archivedAt, archivedById: updated.archivedById, archiveReason: updated.archiveReason },
    });

    await notificationsService.emitEvent({
      eventType: 'lead.archived',
      entityType: 'LEAD',
      entityId: id,
      recipient: 'admin-inbox',
      payload: { leadNumber: lead.leadNumber, reason: input.reason },
    });

    return updated;
  },

  async restore(id: string, actorUserId: string) {
    const lead = await leadRepository.findById(id);
    if (!lead) throw new NotFoundError('Lead not found');
    if (!lead.archivedAt) {
      throw new ValidationError('Lead is not archived');
    }

    const beforeState = { archivedAt: lead.archivedAt, archivedById: lead.archivedById, archiveReason: lead.archiveReason };
    const updated = await leadRepository.restore(id);

    await timelineService.recordEvent({
      entityType: 'LEAD',
      entityId: id,
      eventType: 'LEAD_RESTORED',
      description: `Lead ${lead.leadNumber} restored from archive`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'LEAD',
      entityId: id,
      action: 'RESTORE',
      actorUserId,
      beforeState,
      afterState: { archivedAt: null },
    });

    await notificationsService.emitEvent({
      eventType: 'lead.restored',
      entityType: 'LEAD',
      entityId: id,
      recipient: 'admin-inbox',
      payload: { leadNumber: lead.leadNumber },
    });

    return updated;
  },
};
