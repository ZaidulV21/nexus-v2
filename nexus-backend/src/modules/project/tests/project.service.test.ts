jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../project.repository', () => ({
  projectRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByQuotationVersionId: jest.fn(),
    findByLeadAndClient: jest.fn(),
    listStatusHistoryForServiceIds: jest.fn().mockResolvedValue([]),
    list: jest.fn(),
    listForClient: jest.fn(),
    generateProjectNumber: jest.fn().mockResolvedValue('P-00001'),
  },
  projectServiceRepository: {
    createMany: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    listForProject: jest.fn(),
  },
}));
jest.mock('../../lead/lead.repository', () => ({
  leadRepository: { findById: jest.fn() },
}));
jest.mock('../../lead/lead.service', () => ({
  leadService: { applyQuotationWorkflowStatus: jest.fn() },
}));
jest.mock('../../client/client.repository', () => ({
  clientRepository: { findById: jest.fn() },
}));
jest.mock('../../catalog/service.repository', () => ({
  serviceRepository: { findById: jest.fn() },
}));
jest.mock('../../quotation/quotation.repository', () => ({
  quotationVersionRepository: { findById: jest.fn() },
}));
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../notifications/notifications.service', () => ({ notificationsService: { emitEvent: jest.fn() } }));
jest.mock('../../status-engine/statusEngine.service', () => ({
  statusEngineService: { transition: jest.fn() },
}));

import { projectRepository, projectServiceRepository } from '../project.repository';
import { leadRepository } from '../../lead/lead.repository';
import { clientRepository } from '../../client/client.repository';
import { quotationVersionRepository } from '../../quotation/quotation.repository';
import { timelineService } from '../../timeline/timeline.service';
import { statusEngineService } from '../../status-engine/statusEngine.service';
import { projectService } from '../project.service';

describe('projectService.create', () => {
  it('requires an active, sent quotation version before creating a Project', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1' });
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (quotationVersionRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      projectService.create({ leadId: 'lead1', clientId: 'client1', quotationVersionId: 'ver1' }, 'admin1')
    ).rejects.toThrow('Quotation version does not belong');
  });

  it('creates project services only through the client-acceptance transaction', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      email: 'client@example.com',
      leadServices: [{ id: 'ls1', serviceId: 'svc1' }],
    });
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (quotationVersionRepository.findById as jest.Mock).mockResolvedValue({
      id: 'ver1',
      isActive: true,
      quotation: { id: 'quo1', leadId: 'lead1', status: 'SENT' },
      items: [{ serviceId: 'svc1' }, { serviceId: 'svc1' }],
    });
    (projectRepository.findByQuotationVersionId as jest.Mock).mockResolvedValue(null);
    (projectRepository.findByLeadAndClient as jest.Mock).mockResolvedValue(null);
    (projectRepository.create as jest.Mock).mockResolvedValue({ id: 'proj1', projectNumber: 'P-00001' });
    (projectRepository.listStatusHistoryForServiceIds as jest.Mock).mockResolvedValue([]);
    (projectServiceRepository.createMany as jest.Mock).mockResolvedValue([{ id: 'ps1', status: 'PROJECT CREATED' }]);
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      projectNumber: 'P-00001',
      projectServices: [{ status: 'PROJECT CREATED' }],
    });

    const result = await projectService.create(
      { leadId: 'lead1', clientId: 'client1', quotationVersionId: 'ver1' },
      'client1',
      async () => undefined
    );

    expect(projectRepository.create).toHaveBeenCalled();
    expect(result.projectNumber).toBe('P-00001');
  });

  it('rejects direct project creation from a merely sent quotation', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1' });
    (clientRepository.findById as jest.Mock).mockResolvedValue({ id: 'client1', sourceLeadId: 'lead1' });
    (quotationVersionRepository.findById as jest.Mock).mockResolvedValue({
      id: 'ver1',
      isActive: true,
      quotation: { id: 'quo1', leadId: 'lead1', status: 'SENT' },
      items: [{ serviceId: 'svc1' }],
    });

    await expect(
      projectService.create({ leadId: 'lead1', clientId: 'client1', quotationVersionId: 'ver1' }, 'admin1')
    ).rejects.toThrow('only be created after the client accepts');
  });
});

describe('projectService.complete', () => {
  it('rejects completion while any Project Service is not COMPLETED', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      projectNumber: 'P-00001',
      projectServices: [{ status: 'COMPLETED' }, { status: 'IN PROGRESS' }],
    });

    await expect(projectService.complete('proj1')).rejects.toThrow('must be COMPLETED');
  });

  it('allows completion once every Project Service is COMPLETED', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      projectNumber: 'P-00001',
      projectServices: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }],
    });
    (projectRepository.listStatusHistoryForServiceIds as jest.Mock).mockResolvedValue([]);

    const result = await projectService.complete('proj1', 'admin1');
    expect(result.id).toBe('proj1');
  });
});

describe('projectService.getById - staged progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps each service status to a quarter-step progress percentage', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      projectNumber: 'P-00001',
      projectServices: [
        { id: 'ps1', status: 'PROJECT CREATED' },
        { id: 'ps2', status: 'IN PROGRESS' },
        { id: 'ps3', status: 'ON HOLD' },
        { id: 'ps4', status: 'COMPLETED' },
      ],
    });
    (projectRepository.listStatusHistoryForServiceIds as jest.Mock).mockResolvedValue([]);

    const result = await projectService.getById('proj1');

    expect(result.projectServices.map((ps: any) => ps.progressPercentage)).toEqual([25, 50, 75, 100]);
    expect(result.completionPercentage).toBe(63); // (25+50+75+100) / 4 = 62.5 -> 63
    expect(result.completedServices).toBe(1);
    expect(result.totalServices).toBe(4);
  });

  it('excludes CANCELLED services from the project-level average', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      projectNumber: 'P-00001',
      projectServices: [
        { id: 'ps1', status: 'CANCELLED' },
        { id: 'ps2', status: 'IN PROGRESS' },
        { id: 'ps3', status: 'COMPLETED' },
      ],
    });
    (projectRepository.listStatusHistoryForServiceIds as jest.Mock).mockResolvedValue([]);

    const result = await projectService.getById('proj1');

    expect(result.projectServices.find((ps: any) => ps.id === 'ps1').progressPercentage).toBe(0);
    expect(result.completionPercentage).toBe(75); // (50 + 100) / 2
  });
});

describe('projectService.updateProjectServiceStatus - timeline sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records a STATUS_CHANGED event with the fresh progress and a per-milestone dedupe key', async () => {
    (projectServiceRepository.findById as jest.Mock)
      .mockResolvedValueOnce({
        id: 'ps1',
        status: 'PROJECT CREATED',
        service: { name: 'Interior Design' },
        project: { id: 'proj1', projectNumber: 'P-00001', clientId: 'client1' },
      })
      .mockResolvedValueOnce({
        id: 'ps1',
        status: 'IN PROGRESS',
        service: { name: 'Interior Design' },
        project: { id: 'proj1', projectNumber: 'P-00001' },
      });
    (statusEngineService.transition as jest.Mock).mockResolvedValue({});
    (projectRepository.findById as jest.Mock).mockResolvedValue({
      id: 'proj1',
      projectNumber: 'P-00001',
      projectServices: [{ id: 'ps1', status: 'IN PROGRESS' }],
    });
    (projectRepository.listStatusHistoryForServiceIds as jest.Mock).mockResolvedValue([]);

    await projectService.updateProjectServiceStatus('ps1', { toStatus: 'IN PROGRESS' }, 'admin1');

    expect(statusEngineService.transition).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'PROJECT_SERVICE', entityId: 'ps1', toStatus: 'IN PROGRESS' })
    );
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'PROJECT',
        entityId: 'proj1',
        eventType: 'STATUS_CHANGED',
        description: 'Interior Design is now IN PROGRESS — project progress 50%',
        dedupeKey: 'ps1:IN PROGRESS',
        metadata: expect.objectContaining({
          fromStatus: 'PROJECT CREATED',
          toStatus: 'IN PROGRESS',
          projectServiceId: 'ps1',
          progressPercentage: 50,
        }),
      })
    );
  });
});
