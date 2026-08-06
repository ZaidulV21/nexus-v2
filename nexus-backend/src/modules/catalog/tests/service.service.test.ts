jest.mock('../service.repository', () => ({
  serviceRepository: {
    create: jest.fn(),
    update: jest.fn(),
    disable: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
    undelete: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findBySlug: jest.fn(),
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
  (serviceRepository.findBySlug as jest.Mock).mockResolvedValue(null);
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

describe('serviceService slug handling', () => {
  it('generates a slug from the name when none is provided', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue({ id: 'cat1', name: 'Technology' });
    (serviceRepository.create as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV & Home Security' });

    await serviceService.create({ categoryId: 'cat1', name: 'CCTV & Home Security', requiresSiteVisit: 'NO' });

    expect(serviceRepository.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'cctv-home-security' }));
  });

  it('appends a numeric suffix when the slug already exists', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue({ id: 'cat1', name: 'Technology' });
    (serviceRepository.findBySlug as jest.Mock)
      .mockResolvedValueOnce({ id: 'svc1', slug: 'cctv' })
      .mockResolvedValueOnce(null);
    (serviceRepository.create as jest.Mock).mockResolvedValue({ id: 'svc2', name: 'CCTV' });

    await serviceService.create({ categoryId: 'cat1', name: 'CCTV', requiresSiteVisit: 'NO' });

    expect(serviceRepository.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'cctv-2' }));
  });

  it('uses the admin-supplied slug as-is (deduped)', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue({ id: 'cat1', name: 'Technology' });
    (serviceRepository.create as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV' });

    await serviceService.create({ categoryId: 'cat1', name: 'CCTV', slug: 'commercial-cctv', requiresSiteVisit: 'NO' });

    expect(serviceRepository.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'commercial-cctv' }));
  });

  it('does not change the slug on a rename (stable public URL)', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', categoryId: 'cat1', slug: 'cctv' });
    (serviceRepository.update as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'Security Systems', slug: 'cctv' });

    await serviceService.update('svc1', { name: 'Security Systems' });

    expect(serviceRepository.update).toHaveBeenCalledWith('svc1', { name: 'Security Systems' });
  });
});

describe('serviceService soft delete / undelete', () => {
  it('soft-deletes a service and hides it (isActive false)', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: null });
    (serviceRepository.usageCounts as jest.Mock).mockResolvedValue({ leadServices: 1, projectServices: 0, quotationItems: 0, total: 1 });
    (serviceRepository.softDelete as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: new Date(), isActive: false });

    await serviceService.softDelete('svc1', 'admin1');

    expect(serviceRepository.softDelete).toHaveBeenCalledWith('svc1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'svc1', action: 'DELETE' })
    );
  });

  it('rejects deleting an already-deleted service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: new Date() });
    await expect(serviceService.softDelete('svc1')).rejects.toThrow('already deleted');
  });

  it('restores (undeletes) a soft-deleted service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: new Date(), isActive: false });
    (serviceRepository.undelete as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: null });

    await serviceService.undelete('svc1', 'admin1');

    expect(serviceRepository.undelete).toHaveBeenCalledWith('svc1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'svc1', action: 'RESTORE' })
    );
  });

  it('rejects undeleting a service that is not deleted', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: null });
    await expect(serviceService.undelete('svc1')).rejects.toThrow('not deleted');
  });

  it('rejects editing a soft-deleted service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', categoryId: 'cat1', deletedAt: new Date() });
    await expect(serviceService.update('svc1', { name: 'New Name' })).rejects.toThrow('restore the service first');
  });
});

describe('serviceService.duplicate', () => {
  it('copies the source service into a new draft with a unique slug', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'svc1',
      categoryId: 'cat1',
      name: 'CCTV',
      slug: 'cctv',
      description: 'CCTV installation',
      shortDescription: 'Cameras',
      icon: 'Cctv',
      imageUrl: '/uploads/a.png',
      bannerImage: null,
      thumbnail: null,
      heroImage: null,
      basePrice: '10000',
      estimatedDuration: '5 days',
      requiresSiteVisit: 'YES',
      isFeatured: true,
      isPopular: false,
      sortOrder: 3,
      seoTitle: null,
      metaDescription: null,
      metaKeywords: null,
      ogImage: null,
      canonicalUrl: null,
    });
    (serviceRepository.create as jest.Mock).mockResolvedValue({ id: 'svc2', name: 'CCTV (Copy)' });

    const result = await serviceService.duplicate('svc1', 'admin1');

    expect(result).toEqual({ id: 'svc2', name: 'CCTV (Copy)' });
    expect(serviceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CCTV (Copy)',
        slug: 'cctv-copy',
        categoryId: 'cat1',
        basePrice: 10000,
        isFeatured: true,
      })
    );
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'svc2', action: 'CREATE' })
    );
  });

  it('throws NotFoundError when the source service does not exist', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceService.duplicate('missing-id')).rejects.toThrow('Service not found');
  });
});

describe('serviceService.getById visibility', () => {
  it('hides a soft-deleted service from public/anonymous callers', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: new Date() });
    await expect(serviceService.getById('svc1')).rejects.toThrow('Service not found');
  });

  it('allows admins to fetch a soft-deleted service (restore flow)', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: new Date() });
    (serviceRepository.usageCounts as jest.Mock).mockResolvedValue({ leadServices: 0, projectServices: 0, quotationItems: 0, total: 0 });

    const result = await serviceService.getById('svc1', { id: 'admin1', type: 'ADMIN' });

    expect(result).toMatchObject({ id: 'svc1', name: 'CCTV' });
  });
});
