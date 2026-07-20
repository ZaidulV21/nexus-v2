import { runInTransaction } from '../../core/utils/transaction';
import { leadRepository, leadServiceRepository, leadActivityNoteRepository } from './lead.repository';
import { serviceRepository } from '../catalog/service.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { statusEngineService } from '../status-engine/statusEngine.service';
import { CreateLeadInput, AddServiceToLeadInput, UpdateLeadServiceStatusInput, ArchiveLeadInput } from './lead.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';

export const leadService = {
  // Atomic multi-service intake: either the whole enquiry is recorded, or
  // none of it is. Each Lead Service snapshots the questionnaire version
  // active at submission time.
  async createLead(input: CreateLeadInput) {
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
        serviceRecords.push({
          serviceId: s.serviceId,
          questionnaireVersionId: questionnaire?.id,
          questionnaireAnswers: s.questionnaireAnswers,
        });
      }

      const leadServices = await leadServiceRepository.createMany(lead.id, serviceRecords, tx);

      return { lead, leadServices };
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
    return lead;
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
    return leadRepository.list(pagination);
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

    const leadService = await leadServiceRepository.create(leadId, {
      serviceId: input.serviceId,
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

    // Once the Lead has converted, its services are a read-only sales
    // record - manual status changes are blocked, but automatic updates
    // from quotation/project workflow events continue to keep the historical
    // record synchronized.
    const lead = await leadRepository.findById(leadServiceRecord.leadId);
    if (lead?.convertedAt) {
      throw new ValidationError(
        'This Lead has been converted - Lead Services are read-only. Status updates happen automatically from quotation and project events.'
      );
    }
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