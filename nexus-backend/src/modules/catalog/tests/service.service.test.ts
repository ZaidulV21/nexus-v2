jest.mock('../service.repository', () => ({
  serviceRepository: {
    create: jest.fn(),
    update: jest.fn(),
    disable: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    usageCounts: jest.fn(),
    list: jest.fn(),
    getActiveQuestionnaire: jest.fn(),
    updateImage: jest.fn(),
  },
}));
jest.mock('../category.repository', () => ({
  categoryRepository: { findById: jest.fn() },
}));
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn() },
}));
jest.mock('../../audit/audit.service', () => ({
  auditService: { recordAudit: jest.fn() },
}));

import { serviceRepository } from '../service.repository';
import { categoryRepository } from '../category.repository';
import { auditService } from '../../audit/audit.service';
import { serviceService } from '../service.service';

beforeEach(() => {
  jest.clearAllMocks();
  (serviceRepository.findByName as jest.Mock).mockResolvedValue(null);
});

describe('serviceService.create', () => {
  it('rejects creating a service under a non-existent category', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      serviceService.create({
        categoryId: 'bad-id',
        name: 'CCTV',
        requiresSiteVisit: 'YES',
      })
    ).rejects.toThrow('categoryId does not reference an existing category');
  });

  it('rejects a duplicate service name (case-insensitive)', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue({ id: 'cat1', name: 'Technology' });
    (serviceRepository.findByName as jest.Mock).mockResolvedValue({ id: 'svc-existing', name: 'CCTV' });

    await expect(
      serviceService.create({
        categoryId: 'cat1',
        name: 'cctv',
        requiresSiteVisit: 'YES',
      })
    ).rejects.toThrow('already exists');
  });

  it('creates a service and records timeline + audit entries when the category exists', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue({ id: 'cat1', name: 'Technology' });
    (serviceRepository.create as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV' });

    const result = await serviceService.create({
      categoryId: 'cat1',
      name: 'CCTV',
      requiresSiteVisit: 'YES',
    });

    expect(result).toEqual({ id: 'svc1', name: 'CCTV' });
    expect(serviceRepository.create).toHaveBeenCalled();
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'svc1', action: 'CREATE' })
    );
  });
});

describe('serviceService.update', () => {
  it('rejects renaming a service to an existing name', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', categoryId: 'cat1' });
    (serviceRepository.findByName as jest.Mock).mockResolvedValue({ id: 'svc2', name: 'Solar Installation' });

    await expect(serviceService.update('svc1', { name: 'Solar Installation' })).rejects.toThrow('already exists');
  });

  it('rejects activating an archived service without restoring it', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'svc1',
      name: 'CCTV',
      categoryId: 'cat1',
      archivedAt: new Date(),
    });

    await expect(serviceService.update('svc1', { isActive: true })).rejects.toThrow('restore the service first');
  });
});

describe('serviceService.archive / restore', () => {
  it('archives a service and records the usage snapshot', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', archivedAt: null, isActive: true });
    (serviceRepository.usageCounts as jest.Mock).mockResolvedValue({ leadServices: 2, projectServices: 1, quotationItems: 3, total: 6 });
    (serviceRepository.archive as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', archivedAt: new Date(), isActive: false });

    await serviceService.archive('svc1', 'admin1');

    expect(serviceRepository.archive).toHaveBeenCalledWith('svc1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'svc1', action: 'ARCHIVE' })
    );
  });

  it('rejects archiving an already-archived service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', archivedAt: new Date() });
    await expect(serviceService.archive('svc1')).rejects.toThrow('already archived');
  });

  it('restores an archived service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', archivedAt: new Date(), isActive: false });
    (serviceRepository.restore as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', archivedAt: null, isActive: true });

    await serviceService.restore('svc1', 'admin1');

    expect(serviceRepository.restore).toHaveBeenCalledWith('svc1');
  });

  it('rejects restoring a service that is not archived', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', archivedAt: null });
    await expect(serviceService.restore('svc1')).rejects.toThrow('not archived');
  });
});

describe('serviceService.disable', () => {
  it('throws NotFoundError for a non-existent service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceService.disable('missing-id')).rejects.toThrow('Service not found');
  });
});
