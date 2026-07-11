import { runInTransaction } from '../../core/utils/transaction';
import { projectRepository, projectServiceRepository } from './project.repository';
import { leadRepository, leadServiceRepository } from '../lead/lead.repository';
import { serviceRepository } from '../catalog/service.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { statusEngineService } from '../status-engine/statusEngine.service';
import { computeAggregateStatus } from './project.aggregateStatus';
import { CreateProjectInput, AddServiceToProjectInput, UpdateProjectServiceStatusInput } from './project.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';

async function attachAggregateStatus(project: any) {
  if (!project) return project;
  return { ...project, aggregateStatus: computeAggregateStatus(project.projectServices || []) };
}

export const projectService = {
  // Converts an approved Lead into a Project, carrying over every approved
  // Lead Service as its own independently-tracked Project Service.
  async create(input: CreateProjectInput, actorUserId: string) {
    const lead = await leadRepository.findById(input.leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const leadServices = await leadServiceRepository.listForLead(input.leadId);
    const approvedServices = leadServices.filter((ls) =>
      ['APPROVED', 'PROJECT CREATED', 'IN PROGRESS', 'ON HOLD', 'COMPLETED', 'CLOSED', 'ARCHIVED'].includes(ls.status)
    );
    if (approvedServices.length === 0) {
      throw new ValidationError('Lead has no approved services to convert into a Project');
    }

    const result = await runInTransaction(async (tx) => {
      const projectNumber = await projectRepository.generateProjectNumber(tx);
      const project = await projectRepository.create(
        { projectNumber, leadId: input.leadId, clientId: input.clientId },
        tx
      );

      const projectServices = await projectServiceRepository.createMany(
        project.id,
        approvedServices.map((ls) => ({
          serviceId: ls.serviceId,
          leadServiceId: ls.id,
          assignedQuotationVersionId: input.quotationVersionId,
        })),
        tx
      );

      return { project, projectServices };
    });

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

    return this.getById(result.project.id);
  },

  // Implements PRD 4.3: add a new service to an already-active Project
  // without creating a new Lead or Client.
  async addServiceToProject(projectId: string, input: AddServiceToProjectInput, actorUserId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const service = await serviceRepository.findById(input.serviceId);
    if (!service || !service.isActive) throw new ValidationError('Service is not available in the catalog');

    const projectService = await projectServiceRepository.create({
      projectId,
      serviceId: input.serviceId,
      assignedQuotationVersionId: input.assignedQuotationVersionId,
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

    return projectServiceRepository.findById(projectServiceId);
  },

  // Blocked at the service layer unless every Project Service is COMPLETED -
  // enforced by data, not developer discipline (PRD 9).
  async complete(projectId: string, actorUserId?: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const services = project.projectServices;
    const allCompleted = services.length > 0 && services.every((ps: any) => ps.status === 'COMPLETED');
    if (!allCompleted) {
      throw new ValidationError('All Project Services must be COMPLETED before the Project can be marked complete');
    }

    await timelineService.recordEvent({
      entityType: 'PROJECT',
      entityId: projectId,
      eventType: 'PROJECT_COMPLETED',
      description: `Project ${project.projectNumber} marked complete`,
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
    const withStatus = items.map((p: any) => ({ ...p, aggregateStatus: computeAggregateStatus(p.projectServices || []) }));
    return { items: withStatus, total };
  },

  async listForClient(clientId: string) {
    const projects = await projectRepository.listForClient(clientId);
    return Promise.all(projects.map(attachAggregateStatus));
  },
};
