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
    publish: jest.fn(),
    draft: jest.fn(),
    findManyByIds: jest.fn(),
    bulk: jest.fn(),
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

  it('passes the detail-page content blocks straight through to the repository', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue({ id: 'cat1', name: 'Technology' });
    (serviceRepository.create as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV' });

    await serviceService.create({
      categoryId: 'cat1',
      name: 'CCTV',
      requiresSiteVisit: 'NO',
      features: ['HD cameras', 'Remote viewing'],
      whatsIncluded: ['Site survey', 'Warranty'],
      process: [{ title: 'Survey', description: 'Map the site' }],
      faqs: [{ question: 'Storage?', answer: '30 days' }],
      testimonials: [
        { name: 'Amit Patel', role: 'Owner', company: 'Patel Retail', content: 'Great work', rating: 5 },
      ],
    });

    expect(serviceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        features: ['HD cameras', 'Remote viewing'],
        whatsIncluded: ['Site survey', 'Warranty'],
        process: [{ title: 'Survey', description: 'Map the site' }],
        faqs: [{ question: 'Storage?', answer: '30 days' }],
        testimonials: [{ name: 'Amit Patel', role: 'Owner', company: 'Patel Retail', content: 'Great work', rating: 5 }],
      })
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
      features: ['HD cameras', 'Remote viewing'],
      whatsIncluded: ['Site survey'],
      process: [{ title: 'Survey', description: 'Map the site' }],
      faqs: [{ question: 'Storage?', answer: '30 days' }],
      testimonials: [{ name: 'Amit Patel', role: 'Owner', company: 'Patel Retail', content: 'Great work', rating: 5 }],
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
        publicationState: 'DRAFT',
        features: ['HD cameras', 'Remote viewing'],
        whatsIncluded: ['Site survey'],
        process: [{ title: 'Survey', description: 'Map the site' }],
        faqs: [{ question: 'Storage?', answer: '30 days' }],
        testimonials: [
          { name: 'Amit Patel', role: 'Owner', company: 'Patel Retail', content: 'Great work', rating: 5 },
        ],
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

describe('serviceService.publish / draft', () => {
  it('publishes a service and records timeline + audit', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'svc1',
      name: 'CCTV',
      deletedAt: null,
      publicationState: 'DRAFT',
    });
    (serviceRepository.publish as jest.Mock).mockResolvedValue({
      id: 'svc1',
      name: 'CCTV',
      publicationState: 'PUBLISHED',
    });

    const result = await serviceService.publish('svc1', 'admin1');

    expect(result).toMatchObject({ publicationState: 'PUBLISHED' });
    expect(serviceRepository.publish).toHaveBeenCalledWith('svc1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'svc1', action: 'PUBLISH' })
    );
  });

  it('rejects publishing a non-existent service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceService.publish('missing-id')).rejects.toThrow('Service not found');
  });

  it('rejects publishing a soft-deleted service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV', deletedAt: new Date() });
    await expect(serviceService.publish('svc1')).rejects.toThrow('restore first');
  });

  it('moves a service to draft and records timeline + audit', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'svc1',
      name: 'CCTV',
      deletedAt: null,
      publicationState: 'PUBLISHED',
    });
    (serviceRepository.draft as jest.Mock).mockResolvedValue({
      id: 'svc1',
      name: 'CCTV',
      publicationState: 'DRAFT',
    });

    await serviceService.draft('svc1', 'admin1');

    expect(serviceRepository.draft).toHaveBeenCalledWith('svc1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'svc1', action: 'DRAFT' })
    );
  });
});

describe('serviceService.bulk', () => {
  it('applies an action to every validated id and records timeline + audit', async () => {
    (serviceRepository.findManyByIds as jest.Mock).mockResolvedValue([
      { id: 'svc1', name: 'CCTV', deletedAt: null },
      { id: 'svc2', name: 'Solar', deletedAt: null },
    ]);
    (serviceRepository.bulk as jest.Mock).mockResolvedValue([
      { id: 'svc1', publicationState: 'DRAFT' },
      { id: 'svc2', publicationState: 'DRAFT' },
    ]);

    const result = await serviceService.bulk(['svc1', 'svc2'], 'draft', 'admin1');

    expect(result).toEqual({ items: [{ id: 'svc1', publicationState: 'DRAFT' }, { id: 'svc2', publicationState: 'DRAFT' }], count: 2 });
    expect(serviceRepository.bulk).toHaveBeenCalledWith(['svc1', 'svc2'], 'draft');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE', entityId: 'bulk', action: 'BULK_DRAFT' })
    );
  });

  it('rejects bulk actions when some ids do not exist', async () => {
    (serviceRepository.findManyByIds as jest.Mock).mockResolvedValue([{ id: 'svc1', deletedAt: null }]);
    await expect(serviceService.bulk(['svc1', 'ghost'], 'archive')).rejects.toThrow('ghost');
  });

  it('rejects bulk actions on soft-deleted services', async () => {
    (serviceRepository.findManyByIds as jest.Mock).mockResolvedValue([
      { id: 'svc1', deletedAt: new Date() },
    ]);
    await expect(serviceService.bulk(['svc1'], 'delete')).rejects.toThrow('Soft-deleted services cannot be bulk-edited');
  });

  it('rejects an empty ids array', async () => {
    await expect(serviceService.bulk([], 'publish')).rejects.toThrow('ids must be a non-empty array');
  });
});

describe('serviceService.getById draft visibility', () => {
  it('hides a draft service from public/anonymous callers', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'svc1',
      name: 'CCTV',
      deletedAt: null,
      publicationState: 'DRAFT',
    });
    await expect(serviceService.getById('svc1')).rejects.toThrow('Service not found');
  });

  it('allows admins to fetch a draft service (preview flow)', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'svc1',
      name: 'CCTV',
      deletedAt: null,
      publicationState: 'DRAFT',
    });
    (serviceRepository.usageCounts as jest.Mock).mockResolvedValue({ leadServices: 0, projectServices: 0, quotationItems: 0, total: 0 });

    const result = await serviceService.getById('svc1', { id: 'admin1', type: 'ADMIN' });

    expect(result).toMatchObject({ id: 'svc1', name: 'CCTV', publicationState: 'DRAFT' });
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
