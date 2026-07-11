import { runInTransaction } from '../../core/utils/transaction';
import { leadRepository, leadServiceRepository, leadActivityNoteRepository } from './lead.repository';
import { serviceRepository } from '../catalog/service.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { statusEngineService } from '../status-engine/statusEngine.service';
import { CreateLeadInput, AddServiceToLeadInput, UpdateLeadServiceStatusInput } from './lead.types';
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
        if (!service || !service.isActive) {
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
    if (!service || !service.isActive) throw new ValidationError('Service is not available');

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
};