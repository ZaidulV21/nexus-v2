import { runInTransaction } from '../../core/utils/transaction';
import { Prisma } from '@prisma/client';
import { projectRepository, projectServiceRepository } from './project.repository';
import { leadRepository } from '../lead/lead.repository';
import { clientRepository } from '../client/client.repository';
import { leadService as leadModuleService } from '../lead/lead.service';
import { serviceRepository } from '../catalog/service.repository';
import { quotationVersionRepository } from '../quotation/quotation.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { statusEngineService } from '../status-engine/statusEngine.service';
import { computeAggregateStatus, DONE_PROJECT_SERVICE_STATUSES } from './project.aggregateStatus';
import { CreateProjectInput, AddServiceToProjectInput, UpdateProjectServiceStatusInput } from './project.types';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors/AppError';

const COMPLETED_SERVICE_STATUSES = DONE_PROJECT_SERVICE_STATUSES;

// Per-service progress is derived from where the service sits in the PROJECT
// pipeline (PRD 4.3 / Problem 2): each active stage advances the percentage in
// quarter steps so a single-service project reads 25% -> 50% -> 75% -> 100%.
const PROJECT_SERVICE_PROGRESS: Record<string, number> = {
  'PROJECT CREATED': 25,
  'IN PROGRESS': 50,
  'ON HOLD': 75,
  COMPLETED: 100,
  CANCELLED: 0,
};

function completionPercentage(status: string) {
  return PROJECT_SERVICE_PROGRESS[status] ?? 0;
}

function buildQuotationSummaries(projectServices: any[]) {
  const byQuotationId = new Map<string, any>();
  projectServices.forEach((projectService) => {
    const version = projectService.assignedQuotationVersion;
    const quotation = version?.quotation;
    if (!version || !quotation || byQuotationId.has(quotation.id)) return;

    byQuotationId.set(quotation.id, {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      status: quotation.status,
      activeVersionId: quotation.activeVersionId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      grandTotal: version.grandTotal,
      approvalStatus: version.approvals?.length ? 'APPROVED' : quotation.status,
    });
  });
  return Array.from(byQuotationId.values());
}

// Phase 9: one Project Service per distinct Service on the accepted quotation
// version, carrying the specific Sub Services that line covered. Sub services
// are derived from the quotation's line items (Interior -> Painting,
// Flooring, Lighting each become a sub-service pin) - never manual re-entry.
function uniqueServiceRecordsFromQuotationVersion(version: any): Array<{ serviceId: string; subServiceIds: string[] }> {
  const byService = new Map<string, Set<string>>();
  (version?.items ?? []).forEach((item: any) => {
    if (!item.serviceId) return;
    if (!byService.has(item.serviceId)) byService.set(item.serviceId, new Set());
    if (item.subServiceId) byService.get(item.serviceId)!.add(item.subServiceId);
  });
  return Array.from(byService.entries()).map(([serviceId, subs]) => ({
    serviceId,
    subServiceIds: Array.from(subs),
  }));
}

async function attachAggregateStatus(project: any, statusHistory?: any[]) {
  if (!project) return project;
  const projectServices = project.projectServices || [];
  // Phase 16 (performance): callers may pass a pre-fetched page-wide history
  // so list endpoints run ONE status-transition query instead of one per
  // project (N+1). Single-record callers omit it and fetch as before.
  const history = statusHistory ?? (await projectRepository.listStatusHistoryForServiceIds(projectServices.map((ps: any) => ps.id)));
  const historyByServiceId = new Map<string, any[]>();
  history.forEach((entry: any) => {
    const entries = historyByServiceId.get(entry.entityId) || [];
    entries.push(entry);
    historyByServiceId.set(entry.entityId, entries);
  });

  const completedServices = projectServices.filter((ps: any) => COMPLETED_SERVICE_STATUSES.has(ps.status)).length;
  const totalServices = projectServices.length;
  const activeServices = projectServices.filter((ps: any) => ps.status !== 'CANCELLED');
  const enrichedServices = projectServices.map((ps: any) => ({
    ...ps,
    progressPercentage: completionPercentage(ps.status),
    statusHistory: historyByServiceId.get(ps.id) || [],
  }));

  return {
    ...project,
    projectServices: enrichedServices,
    quotations: buildQuotationSummaries(projectServices),
    aggregateStatus: computeAggregateStatus(projectServices),
    completedServices,
    totalServices,
    // Project-level progress is the mean of the per-service stage progress so it
    // moves with every status change instead of only flipping to 100% when all
    // services complete. CANCELLED services are out of scope and excluded.
    completionPercentage: activeServices.length
      ? Math.round(activeServices.reduce((sum: number, ps: any) => sum + completionPercentage(ps.status), 0) / activeServices.length)
      : 0,
  };
}

// Phase 16 (performance): batch version of attachAggregateStatus for list
// endpoints. Collects every Project Service id across the page and fetches all
// status-transition history in ONE query, then distributes it per project.
async function attachAggregateStatuses(projects: any[]) {
  if (projects.length === 0) return [];
  const allServiceIds = projects.flatMap((project: any) => (project.projectServices || []).map((ps: any) => ps.id));
  const statusHistory = await projectRepository.listStatusHistoryForServiceIds(allServiceIds);
  return Promise.all(projects.map((project: any) => attachAggregateStatus(project, statusHistory)));
}

export const projectService = {
  // Converts an accepted quotation into a Project, copying the active
  // quotation version's services into Project Services.
  //
  // `inSameTransaction` (optional) runs inside the same DB transaction as
  // the project creation, after the project rows are written - used by
  // quotationService.accept to flip the quotation status atomically with
  // project creation: if either write fails, both roll back.
  async create(
    input: CreateProjectInput,
    actorUserId: string,
    inSameTransaction?: (tx: Prisma.TransactionClient) => Promise<void>
  ) {
    if (!input.quotationVersionId) {
      throw new ValidationError('A quotation version is required to create a Project');
    }

    const lead = await leadRepository.findById(input.leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const client = await clientRepository.findById(input.clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }
    // Verify the Lead belongs to this Client. Two valid relationships:
    // 1. Client was created from this Lead (client.sourceLeadId === leadId)
    // 2. This Lead was created by an existing Client (lead.clientId === clientId)
    if (client.sourceLeadId !== input.leadId) {
      const lead = await leadRepository.findById(input.leadId);
      if (!lead || lead.clientId !== input.clientId) {
        throw new ValidationError('Client does not belong to this Lead');
      }
    }

    const quotationVersion = await quotationVersionRepository.findById(input.quotationVersionId);
    if (
      !quotationVersion ||
      ((quotationVersion as any).quotation.leadId !== input.leadId && (quotationVersion as any).quotation.clientId !== input.clientId)
    ) {
      throw new ValidationError('Quotation version does not belong to this Lead');
    }
    if (!quotationVersion.isActive) {
      throw new ValidationError('Only the active quotation version can be used to create a Project');
    }

    const quotation = (quotationVersion as any).quotation;
    // The public project endpoint must never bypass client acceptance. During
    // quotationService.accept the quotation is still SENT until its callback
    // flips it to ACCEPTED inside this same transaction, so that sole
    // internal path is explicitly identified by the transaction callback.
    if (quotation.status !== 'ACCEPTED' && !inSameTransaction) {
      throw new ValidationError('A Project can only be created after the client accepts a sent quotation');
    }
    if (quotation.status !== 'SENT' && quotation.status !== 'ACCEPTED') {
      throw new ValidationError('Only sent quotations can be converted into a Project');
    }

    const existingProject = await projectRepository.findByQuotationVersionId(input.quotationVersionId);
    if (existingProject) {
      throw new ConflictError('A Project already exists for this quotation version');
    }

    const projectServicesFromQuotation = uniqueServiceRecordsFromQuotationVersion(quotationVersion);
    if (projectServicesFromQuotation.length === 0) {
      throw new ValidationError('Quotation version has no services to convert into a Project');
    }

    const result = await runInTransaction(async (tx) => {
      const projectNumber = await projectRepository.generateProjectNumber(tx);
      const project = await projectRepository.create(
        {
          projectNumber,
          leadId: input.leadId,
          clientId: input.clientId,
          // Phase 9: the Project always knows the origin Quotation it was
          // created from - no re-entry, traceable at a glance.
          quotationId: quotation.id,
        },
        tx
      );

      const projectServices = await projectServiceRepository.createMany(
        project.id,
        projectServicesFromQuotation.map((serviceRecord: { serviceId: string; subServiceIds: string[] }) => ({
          serviceId: serviceRecord.serviceId,
          leadServiceId: lead.leadServices?.find((leadService) => leadService.serviceId === serviceRecord.serviceId)?.id,
          assignedQuotationVersionId: input.quotationVersionId,
          subServiceIds: serviceRecord.subServiceIds,
        })),
        tx
      );

      if (inSameTransaction) await inSameTransaction(tx);

      return { project, projectServices };
    });

    // Lead pipeline automation: once the Project exists, the Lead pipeline
    // for the converted services is complete - they move to PROJECT CREATED.
    await leadModuleService.applyQuotationWorkflowStatus(
      input.leadId,
      projectServicesFromQuotation.map((serviceRecord) => serviceRecord.serviceId),
      'PROJECT CREATED',
      actorUserId
    );

    await timelineService.recordEvent({
      entityType: 'PROJECT',
      entityId: result.project.id,
      eventType: 'PROJECT_CREATED',
      description: `Project ${result.project.projectNumber} created with ${result.projectServices.length} service(s)`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'PROJECT',
      entityId: result.project.id,
      action: 'CREATE',
      afterState: result,
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'project.created',
      entityType: 'PROJECT',
      entityId: result.project.id,
      recipient: lead.email ?? 'client-on-file',
      payload: {
        projectId: result.project.id,
        projectNumber: result.project.projectNumber,
        quotationId: quotation.id,
        quotationVersionId: input.quotationVersionId,
        clientId: input.clientId,
      },
    });

    return this.getById(result.project.id);
  },

  // Implements PRD 4.3: add a new service to an already-active Project
  // without creating a new Lead or Client. When the admin attaches it to a
  // quotation version, the Sub Services are derived from that version's line
  // items for the service - no manual re-entry.
  async addServiceToProject(projectId: string, input: AddServiceToProjectInput, actorUserId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const service = await serviceRepository.findById(input.serviceId);
    if (!service || !service.isActive) throw new ValidationError('Service is not available in the catalog');

    let subServiceIds: string[] = [];
    if (input.assignedQuotationVersionId) {
      const version = await quotationVersionRepository.findById(input.assignedQuotationVersionId);
      if (version) {
        subServiceIds = uniqueServiceRecordsFromQuotationVersion(version)
          .find((record) => record.serviceId === input.serviceId)
          ?.subServiceIds ?? [];
      }
    }

    const projectService = await projectServiceRepository.create({
      projectId,
      serviceId: input.serviceId,
      assignedQuotationVersionId: input.assignedQuotationVersionId,
      subServiceIds,
    });

    await timelineService.recordEvent({
      entityType: 'PROJECT',
      entityId: projectId,
      eventType: 'SERVICE_ADDED',
      description: `Service "${service.name}" added to Project ${project.projectNumber}`,
      actorUserId,
    });

    return projectService;
  },

  async updateProjectServiceStatus(projectServiceId: string, input: UpdateProjectServiceStatusInput, actorUserId?: string) {
    const record = await projectServiceRepository.findById(projectServiceId);
    if (!record) throw new NotFoundError('Project Service not found');

    await statusEngineService.transition({
      entityType: 'PROJECT_SERVICE',
      entityId: projectServiceId,
      fromStatus: record.status,
      toStatus: input.toStatus,
      actorUserId,
      reason: input.reason,
    });

    // Reload the project so the timeline event carries the freshly computed
    // progress (Problem 2): both the Admin and the Client timelines must show
    // the same "project progress X%" update the moment a status changes.
    const freshProject = await projectRepository.findById(record.project.id);
    const progressPercentage = freshProject ? (await attachAggregateStatus(freshProject)).completionPercentage : 0;

    const serviceName = record.service?.name ?? 'Service';
    await timelineService.recordEvent({
      entityType: 'PROJECT',
      entityId: record.project.id,
      eventType: 'STATUS_CHANGED',
      description: `${serviceName} is now ${input.toStatus} — project progress ${progressPercentage}%`,
      actorUserId,
      // Per-milestone identity so rapid 25% -> 50% -> 75% -> 100% updates each
      // record a distinct timeline entry instead of collapsing into one dupes.
      dedupeKey: `${projectServiceId}:${input.toStatus}`,
      metadata: {
        fromStatus: record.status,
        toStatus: input.toStatus,
        projectServiceId,
        serviceName,
        progressPercentage,
      },
    });

    await notificationsService.emitEvent({
      eventType: 'project.status_changed',
      entityType: 'PROJECT',
      entityId: record.project.id,
      recipient: 'admin-inbox',
      payload: {
        projectNumber: record.project.projectNumber,
        fromStatus: record.status,
        toStatus: input.toStatus,
        progressPercentage,
        clientId: record.project.clientId,
      },
    });

    return projectServiceRepository.findById(projectServiceId);
  },

  // Blocked at the service layer unless every Project Service is COMPLETED -
  // enforced by data, not developer discipline (PRD 9). This is the single
  // moment a Project "becomes Completed": it stamps `completedAt`, which makes
  // the Project appear on the public portfolio automatically and unlocks the
  // completion-gallery uploads (images, videos, documents).
  async complete(projectId: string, actorUserId?: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.completedAt) throw new ConflictError('Project is already completed');

    const services = project.projectServices;
    const active = services.filter((ps: any) => ps.status !== 'CANCELLED');
    const allCompleted = active.length > 0 && active.every((ps: any) => COMPLETED_SERVICE_STATUSES.has(ps.status));
    if (!allCompleted) {
      throw new ValidationError('All Project Services must be COMPLETED before the Project can be marked complete');
    }

    await projectRepository.setCompleted(projectId, actorUserId);

    await timelineService.recordEvent({
      entityType: 'PROJECT',
      entityId: projectId,
      eventType: 'PROJECT_COMPLETED',
      description: `Project ${project.projectNumber} marked complete`,
      actorUserId,
    });

    return this.getById(projectId);
  },

  // Portfolio title is the only free-form field on a Project an admin edits
  // directly (used as the public project name). Mirrors the title/description
  // style used elsewhere: updated in place, recorded in the timeline + audit.
  async updateTitle(projectId: string, title: string, actorUserId?: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const updated = await projectRepository.update(projectId, { title: title.trim() || null });

    await timelineService.recordEvent({
      entityType: 'PROJECT',
      entityId: projectId,
      eventType: 'PROJECT_UPDATED',
      description: `Project ${project.projectNumber} portfolio title ${updated.title ? `updated to "${updated.title}"` : 'cleared'}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'PROJECT',
      entityId: projectId,
      action: 'UPDATE',
      beforeState: { title: project.title ?? null },
      afterState: { title: updated.title ?? null },
      actorUserId,
    });

    return this.getById(projectId);
  },

  async getById(id: string) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    return attachAggregateStatus(project);
  },

  async list(pagination: any) {
    const { items, total } = await projectRepository.list(pagination);
    const withStatus = await attachAggregateStatuses(items);
    return { items: withStatus, total };
  },

  async listForClient(clientId: string, pagination?: any) {
    const projects = await projectRepository.listForClient(clientId, pagination);
    if (Array.isArray(projects)) return attachAggregateStatuses(projects);
    return { items: await attachAggregateStatuses(projects.items), total: projects.total };
  },

  async getForClient(id: string, clientId: string) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    if (project.clientId !== clientId) {
      throw new NotFoundError('Project not found');
    }
    return attachAggregateStatus(project);
  },
};
