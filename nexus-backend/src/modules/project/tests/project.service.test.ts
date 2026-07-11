jest.mock('../../../core/utils/transaction', () => ({
  runInTransaction: jest.fn((fn) => fn({})),
}));
jest.mock('../project.repository', () => ({
  projectRepository: {
    create: jest.fn(),
    findById: jest.fn(),
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
  leadServiceRepository: { listForLead: jest.fn() },
}));
jest.mock('../../catalog/service.repository', () => ({
  serviceRepository: { findById: jest.fn() },
}));
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));
jest.mock('../../audit/audit.service', () => ({ auditService: { recordAudit: jest.fn() } }));
jest.mock('../../status-engine/statusEngine.service', () => ({
  statusEngineService: { transition: jest.fn() },
}));

import { projectRepository } from '../project.repository';
import { leadRepository, leadServiceRepository } from '../../lead/lead.repository';
import { projectService } from '../project.service';

describe('projectService.create', () => {
  it('rejects creating a Project from a Lead with no approved services', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1' });
    (leadServiceRepository.listForLead as jest.Mock).mockResolvedValue([{ status: 'NEW' }]);

    await expect(
      projectService.create({ leadId: 'lead1', clientId: 'client1' }, 'admin1')
    ).rejects.toThrow('no approved services');
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

    const result = await projectService.complete('proj1', 'admin1');
    expect(result.id).toBe('proj1');
  });
});
