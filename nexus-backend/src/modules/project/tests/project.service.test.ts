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
import { quotationVersionRepository } from '../../quotation/quotation.repository';
import { projectService } from '../project.service';

describe('projectService.create', () => {
  it('requires an active, sent quotation version before creating a Project', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1' });
    (quotationVersionRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      projectService.create({ leadId: 'lead1', clientId: 'client1', quotationVersionId: 'ver1' }, 'admin1')
    ).rejects.toThrow('Quotation version does not belong');
  });

  it('creates project services from the quotation version when valid', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({
      id: 'lead1',
      email: 'client@example.com',
      leadServices: [{ id: 'ls1', serviceId: 'svc1' }],
    });
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
      'admin1'
    );

    expect(projectRepository.create).toHaveBeenCalled();
    expect(result.projectNumber).toBe('P-00001');
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
