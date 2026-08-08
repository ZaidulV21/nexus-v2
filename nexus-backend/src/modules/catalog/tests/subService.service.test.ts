jest.mock('../subService.repository', () => ({
  subServiceRepository: {
    create: jest.fn(),
    update: jest.fn(),
    disable: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
    undelete: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findByServiceAndSlug: jest.fn(),
    listByService: jest.fn(),
    reorder: jest.fn(),
    publish: jest.fn(),
    draft: jest.fn(),
    findManyByIds: jest.fn(),
    bulk: jest.fn(),
  },
}));
jest.mock('../service.repository', () => ({
  serviceRepository: {
    findById: jest.fn(),
    findBySlug: jest.fn(),
  },
}));
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn() },
}));
jest.mock('../../audit/audit.service', () => ({
  auditService: { recordAudit: jest.fn() },
}));

import { subServiceRepository } from '../subService.repository';
import { serviceRepository } from '../service.repository';
import { auditService } from '../../audit/audit.service';
import { subServiceService } from '../subService.service';

const service = { id: 'svc1', name: 'Interior Design', deletedAt: null };

beforeEach(() => {
  jest.clearAllMocks();
  (serviceRepository.findById as jest.Mock).mockResolvedValue(null);
  (serviceRepository.findBySlug as jest.Mock).mockResolvedValue(null);
  (subServiceRepository.findByName as jest.Mock).mockResolvedValue(null);
});

describe('subServiceService.create', () => {
  it('rejects creating a sub-service under a non-existent service', async () => {
    await expect(
      subServiceService.create('bad-ref', { name: 'False Ceiling' })
    ).rejects.toThrow('Service not found');
  });

  it('rejects adding a sub-service to a soft-deleted service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ ...service, deletedAt: new Date() });
    await expect(
      subServiceService.create('svc1', { name: 'False Ceiling' })
    ).rejects.toThrow('Deleted services cannot have sub-services added');
  });

  it('rejects a duplicate sub-service name within the same service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.findByName as jest.Mock).mockResolvedValue({ id: 'sub-existing', name: 'False Ceiling' });

    await expect(
      subServiceService.create('svc1', { name: 'false ceiling' })
    ).rejects.toThrow('already exists under this service');
  });

  it('creates a sub-service under the resolved service and records timeline + audit', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.create as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', slug: 'false-ceiling' });

    const result = await subServiceService.create('svc1', { name: 'False Ceiling' }, 'admin1');

    expect(result).toEqual({ id: 'sub1', name: 'False Ceiling', slug: 'false-ceiling' });
    expect(subServiceRepository.create).toHaveBeenCalledWith('svc1', expect.objectContaining({ slug: 'false-ceiling' }));
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'CREATE' })
    );
  });

  it('resolves the parent service by slug when given a public slug', async () => {
    (serviceRepository.findBySlug as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.create as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', slug: 'false-ceiling' });

    await subServiceService.create('interior-design', { name: 'False Ceiling' });

    expect(subServiceRepository.create).toHaveBeenCalledWith('svc1', expect.objectContaining({ slug: 'false-ceiling' }));
  });

  it('appends a numeric suffix when the slug already exists under the service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.findByServiceAndSlug as jest.Mock)
      .mockResolvedValueOnce({ id: 'sub1', slug: 'false-ceiling' })
      .mockResolvedValueOnce(null);
    (subServiceRepository.create as jest.Mock).mockResolvedValue({ id: 'sub2', name: 'False Ceiling' });

    await subServiceService.create('svc1', { name: 'False Ceiling' });

    expect(subServiceRepository.create).toHaveBeenCalledWith('svc1', expect.objectContaining({ slug: 'false-ceiling-2' }));
  });
});

describe('subServiceService.update', () => {
  it('rejects renaming a sub-service to an existing name within the service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', serviceId: 'svc1', deletedAt: null });
    (subServiceRepository.findByName as jest.Mock).mockResolvedValue({ id: 'sub2', name: 'Modular Office' });

    await expect(subServiceService.update('sub1', { name: 'Modular Office' })).rejects.toThrow('already exists under this service');
  });

  it('rejects editing a soft-deleted sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', serviceId: 'svc1', deletedAt: new Date() });
    await expect(subServiceService.update('sub1', { name: 'New Name' })).rejects.toThrow('restore the sub-service first');
  });

  it('rejects activating an archived sub-service without restoring it', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'sub1', name: 'False Ceiling', serviceId: 'svc1', deletedAt: null, archivedAt: new Date(),
    });
    await expect(subServiceService.update('sub1', { isActive: true })).rejects.toThrow('restore the sub-service first');
  });

  it('updates a sub-service and records timeline + audit', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', serviceId: 'svc1', deletedAt: null });
    (subServiceRepository.update as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', startingPrice: '₹95 / sq ft' });

    await subServiceService.update('sub1', { startingPrice: '₹95 / sq ft' }, 'admin1');

    expect(subServiceRepository.update).toHaveBeenCalledWith('sub1', { startingPrice: '₹95 / sq ft' });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'UPDATE' })
    );
  });
});

describe('subServiceService.archive / restore / disable', () => {
  it('archives a sub-service and records audit', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', archivedAt: null, isActive: true });
    (subServiceRepository.archive as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', archivedAt: new Date(), isActive: false });

    await subServiceService.archive('sub1', 'admin1');

    expect(subServiceRepository.archive).toHaveBeenCalledWith('sub1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'ARCHIVE' })
    );
  });

  it('rejects archiving an already-archived sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', archivedAt: new Date() });
    await expect(subServiceService.archive('sub1')).rejects.toThrow('already archived');
  });

  it('restores an archived sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', archivedAt: new Date(), isActive: false });
    (subServiceRepository.restore as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', archivedAt: null, isActive: true });

    await subServiceService.restore('sub1', 'admin1');

    expect(subServiceRepository.restore).toHaveBeenCalledWith('sub1');
  });

  it('disables a sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', isActive: true });
    (subServiceRepository.disable as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', isActive: false });

    await subServiceService.disable('sub1', 'admin1');

    expect(subServiceRepository.disable).toHaveBeenCalledWith('sub1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'DISABLE' })
    );
  });
});

describe('subServiceService soft delete / undelete', () => {
  it('soft-deletes a sub-service and hides it', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', deletedAt: null });
    (subServiceRepository.softDelete as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', deletedAt: new Date(), isActive: false });

    await subServiceService.softDelete('sub1', 'admin1');

    expect(subServiceRepository.softDelete).toHaveBeenCalledWith('sub1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'DELETE' })
    );
  });

  it('restores (undeletes) a soft-deleted sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', deletedAt: new Date(), isActive: false });
    (subServiceRepository.undelete as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', deletedAt: null });

    await subServiceService.undelete('sub1', 'admin1');

    expect(subServiceRepository.undelete).toHaveBeenCalledWith('sub1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'RESTORE' })
    );
  });
});

describe('subServiceService.duplicate', () => {
  it('copies the source sub-service into a new draft with a unique slug', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'sub1',
      serviceId: 'svc1',
      name: 'False Ceiling',
      slug: 'false-ceiling',
      shortDescription: 'Designer ceilings',
      description: 'Full scope',
      icon: 'LayoutGrid',
      heroImage: '/uploads/hero.png',
      gallery: ['/uploads/a.png', '/uploads/b.png'],
      features: ['Cove lighting'],
      whatsIncluded: ['Quality inspection'],
      process: [{ title: 'Design', description: 'Plan the ceiling' }],
      faqs: [{ question: 'Cost?', answer: 'Depends' }],
      startingPrice: '₹95 / sq ft',
      completionTime: '1-3 weeks',
      sortOrder: 0,
      seoTitle: null,
      metaDescription: null,
      metaKeywords: null,
      ogImage: null,
      canonicalUrl: null,
    });
    (subServiceRepository.create as jest.Mock).mockResolvedValue({ id: 'sub2', name: 'False Ceiling (Copy)' });

    const result = await subServiceService.duplicate('sub1', 'admin1');

    expect(result).toEqual({ id: 'sub2', name: 'False Ceiling (Copy)' });
    expect(subServiceRepository.create).toHaveBeenCalledWith(
      'svc1',
      expect.objectContaining({
        name: 'False Ceiling (Copy)',
        slug: 'false-ceiling-copy',
        publicationState: 'DRAFT',
        gallery: ['/uploads/a.png', '/uploads/b.png'],
        features: ['Cove lighting'],
        startingPrice: '₹95 / sq ft',
      })
    );
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub2', action: 'CREATE' })
    );
  });

  it('throws NotFoundError when the source sub-service does not exist', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(subServiceService.duplicate('missing-id')).rejects.toThrow('Sub-service not found');
  });
});

describe('subServiceService.getById visibility', () => {
  it('hides a soft-deleted sub-service from public/anonymous callers', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', deletedAt: new Date() });
    await expect(subServiceService.getById('sub1')).rejects.toThrow('Sub-service not found');
  });

  it('allows admins to fetch a soft-deleted sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', deletedAt: new Date() });

    const result = await subServiceService.getById('sub1', { id: 'admin1', type: 'ADMIN' });

    expect(result).toMatchObject({ id: 'sub1', name: 'False Ceiling' });
  });

  it('hides a draft sub-service from public/anonymous callers', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'sub1',
      name: 'False Ceiling',
      deletedAt: null,
      publicationState: 'DRAFT',
    });
    await expect(subServiceService.getById('sub1')).rejects.toThrow('Sub-service not found');
  });

  it('allows admins to fetch a draft sub-service (preview flow)', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'sub1',
      name: 'False Ceiling',
      deletedAt: null,
      publicationState: 'DRAFT',
    });

    const result = await subServiceService.getById('sub1', { id: 'admin1', type: 'ADMIN' });

    expect(result).toMatchObject({ id: 'sub1', name: 'False Ceiling', publicationState: 'DRAFT' });
  });
});

describe('subServiceService.publish / draft', () => {
  it('publishes a sub-service and records timeline + audit', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'sub1',
      name: 'False Ceiling',
      deletedAt: null,
      publicationState: 'DRAFT',
    });
    (subServiceRepository.publish as jest.Mock).mockResolvedValue({
      id: 'sub1',
      name: 'False Ceiling',
      publicationState: 'PUBLISHED',
    });

    const result = await subServiceService.publish('sub1', 'admin1');

    expect(result).toMatchObject({ publicationState: 'PUBLISHED' });
    expect(subServiceRepository.publish).toHaveBeenCalledWith('sub1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'PUBLISH' })
    );
  });

  it('rejects publishing a non-existent sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(subServiceService.publish('missing-id')).rejects.toThrow('Sub-service not found');
  });

  it('rejects publishing a soft-deleted sub-service', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', deletedAt: new Date() });
    await expect(subServiceService.publish('sub1')).rejects.toThrow('restore first');
  });

  it('moves a sub-service to draft and records timeline + audit', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'sub1',
      name: 'False Ceiling',
      deletedAt: null,
      publicationState: 'PUBLISHED',
    });
    (subServiceRepository.draft as jest.Mock).mockResolvedValue({
      id: 'sub1',
      name: 'False Ceiling',
      publicationState: 'DRAFT',
    });

    await subServiceService.draft('sub1', 'admin1');

    expect(subServiceRepository.draft).toHaveBeenCalledWith('sub1');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'DRAFT' })
    );
  });
});

describe('subServiceService.bulk', () => {
  it('applies an action to every validated id and records timeline + audit', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.findManyByIds as jest.Mock).mockResolvedValue([
      { id: 'sub1', deletedAt: null },
      { id: 'sub2', deletedAt: null },
    ]);
    (subServiceRepository.bulk as jest.Mock).mockResolvedValue([
      { id: 'sub1', publicationState: 'DRAFT' },
      { id: 'sub2', publicationState: 'DRAFT' },
    ]);

    const result = await subServiceService.bulk('svc1', ['sub1', 'sub2'], 'draft', 'admin1');

    expect(result).toEqual({
      items: [{ id: 'sub1', publicationState: 'DRAFT' }, { id: 'sub2', publicationState: 'DRAFT' }],
      count: 2,
    });
    expect(subServiceRepository.bulk).toHaveBeenCalledWith('svc1', ['sub1', 'sub2'], 'draft');
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'svc1', action: 'BULK_DRAFT' })
    );
  });

  it('rejects bulk actions for a non-existent service', async () => {
    await expect(subServiceService.bulk('bad-ref', ['sub1'], 'archive')).rejects.toThrow('Service not found');
  });

  it('rejects bulk actions when some ids do not exist', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.findManyByIds as jest.Mock).mockResolvedValue([{ id: 'sub1', deletedAt: null }]);
    await expect(subServiceService.bulk('svc1', ['sub1', 'ghost'], 'archive')).rejects.toThrow('ghost');
  });

  it('rejects bulk actions on soft-deleted sub-services', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.findManyByIds as jest.Mock).mockResolvedValue([{ id: 'sub1', deletedAt: new Date() }]);
    await expect(subServiceService.bulk('svc1', ['sub1'], 'delete')).rejects.toThrow('Soft-deleted sub-services cannot be bulk-edited');
  });

  it('rejects an empty ids array', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    await expect(subServiceService.bulk('svc1', [], 'publish')).rejects.toThrow('ids must be a non-empty array');
  });
});

describe('subServiceService.listByService', () => {
  it('rejects listing sub-services for a non-existent service', async () => {
    await expect(
      subServiceService.listByService('bad-ref', { page: 1, pageSize: 20, skip: 0, take: 20, sortOrder: 'asc' }, true)
    ).rejects.toThrow('Service not found');
  });

  it('returns sub-services for a service, delegating active filtering to the repository', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.listByService as jest.Mock).mockResolvedValue({ items: [{ id: 'sub1' }], total: 1 });

    const result = await subServiceService.listByService('svc1', { page: 1, pageSize: 20, skip: 0, take: 20, sortOrder: 'asc' }, true, { status: 'ALL' });

    expect(result).toEqual({ items: [{ id: 'sub1' }], total: 1 });
    expect(subServiceRepository.listByService).toHaveBeenCalledWith('svc1', true, { status: 'ALL' }, { skip: 0, take: 20 });
  });
});

describe('subServiceService.reorder', () => {
  it('rejects reordering a non-existent service', async () => {
    await expect(subServiceService.reorder('bad-ref', ['sub1'])).rejects.toThrow('Service not found');
  });

  it('rejects ids that do not belong to the service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.listByService as jest.Mock).mockResolvedValue({ items: [{ id: 'sub1' }, { id: 'sub2' }], total: 2 });

    await expect(subServiceService.reorder('svc1', ['sub1', 'sub9'])).rejects.toThrow('does not belong to this service');
  });

  it('rejects duplicate ids', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);

    await expect(subServiceService.reorder('svc1', ['sub1', 'sub1'])).rejects.toThrow('duplicate');
  });

  it('persists the new order and records a timeline event', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (subServiceRepository.listByService as jest.Mock).mockResolvedValue({ items: [{ id: 'sub1' }, { id: 'sub2' }], total: 2 });
    (subServiceRepository.reorder as jest.Mock).mockResolvedValue([{}, {}]);

    const result = await subServiceService.reorder('svc1', ['sub2', 'sub1'], 'admin1');

    expect(subServiceRepository.reorder).toHaveBeenCalledWith(['sub2', 'sub1']);
    expect(result).toEqual({ orderedIds: ['sub2', 'sub1'] });
  });
});

describe('subServiceService.updateImage', () => {
  it('updates the hero image slot and records audit', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', heroImage: null });
    (subServiceRepository.update as jest.Mock).mockResolvedValue({ id: 'sub1', heroImage: '/uploads/hero.png' });

    await subServiceService.updateImage('sub1', '/uploads/hero.png', 'heroImage', 'admin1');

    expect(subServiceRepository.update).toHaveBeenCalledWith('sub1', { heroImage: '/uploads/hero.png' });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'UPDATE' })
    );
  });

  it('clears the image with null', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', heroImage: '/uploads/hero.png' });
    (subServiceRepository.update as jest.Mock).mockResolvedValue({ id: 'sub1', heroImage: null });

    await subServiceService.updateImage('sub1', null, 'heroImage', 'admin1');

    expect(subServiceRepository.update).toHaveBeenCalledWith('sub1', { heroImage: null });
  });

  it('throws NotFoundError when the sub-service does not exist', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(subServiceService.updateImage('missing-id', '/uploads/hero.png', 'heroImage')).rejects.toThrow('Sub-service not found');
  });

  it('appends an uploaded image to the gallery array', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', gallery: ['/uploads/a.png'] });
    (subServiceRepository.update as jest.Mock).mockResolvedValue({ id: 'sub1', gallery: ['/uploads/a.png', '/uploads/b.png'] });

    await subServiceService.updateImage('sub1', '/uploads/b.png', 'gallery', 'admin1');

    expect(subServiceRepository.update).toHaveBeenCalledWith('sub1', { gallery: ['/uploads/a.png', '/uploads/b.png'] });
  });

  it('rejects appending a gallery image without a URL', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', gallery: [] });
    await expect(subServiceService.updateImage('sub1', null, 'gallery', 'admin1')).rejects.toThrow('A gallery image URL is required');
  });

  it('removes a single URL from the gallery array', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({
      id: 'sub1', name: 'False Ceiling', gallery: ['/uploads/a.png', '/uploads/b.png'],
    });
    (subServiceRepository.update as jest.Mock).mockResolvedValue({ id: 'sub1', gallery: ['/uploads/a.png'] });

    await subServiceService.removeGalleryImage('sub1', '/uploads/b.png', 'admin1');

    expect(subServiceRepository.update).toHaveBeenCalledWith('sub1', { gallery: ['/uploads/a.png'] });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SUB_SERVICE', entityId: 'sub1', action: 'UPDATE' })
    );
  });

  it('rejects removing a gallery image without a URL', async () => {
    (subServiceRepository.findById as jest.Mock).mockResolvedValue({ id: 'sub1', name: 'False Ceiling', gallery: [] });
    await expect(subServiceService.removeGalleryImage('sub1', '')).rejects.toThrow('A gallery image URL is required');
  });
});
