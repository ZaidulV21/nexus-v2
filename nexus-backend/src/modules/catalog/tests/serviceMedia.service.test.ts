jest.mock('../serviceMedia.repository', () => ({
  serviceMediaRepository: {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    listByService: jest.fn(),
    reorder: jest.fn(),
    setFeatured: jest.fn(),
    setActive: jest.fn(),
    hardDelete: jest.fn(),
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

import { serviceMediaRepository } from '../serviceMedia.repository';
import { serviceRepository } from '../service.repository';
import { auditService } from '../../audit/audit.service';
import { serviceMediaService } from '../serviceMedia.service';

const service = { id: 'svc1', name: 'CCTV Installation', deletedAt: null };

beforeEach(() => {
  jest.clearAllMocks();
  (serviceRepository.findById as jest.Mock).mockResolvedValue(null);
  (serviceRepository.findBySlug as jest.Mock).mockResolvedValue(null);
});

describe('serviceMediaService.create', () => {
  it('rejects creating a gallery item under a non-existent service', async () => {
    await expect(
      serviceMediaService.create('bad-ref', { type: 'IMAGE', url: '/uploads/a.png' })
    ).rejects.toThrow('Service not found');
  });

  it('rejects adding a gallery item to a soft-deleted service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ ...service, deletedAt: new Date() });
    await expect(
      serviceMediaService.create('svc1', { type: 'IMAGE', url: '/uploads/a.png' })
    ).rejects.toThrow('Deleted services cannot have gallery items');
  });

  it('creates a gallery item under the resolved service and records timeline + audit', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.create as jest.Mock).mockResolvedValue({
      id: 'media1', type: 'IMAGE', url: '/uploads/a.png',
    });

    const result = await serviceMediaService.create('svc1', { type: 'IMAGE', url: '/uploads/a.png' }, 'admin1');

    expect(result).toEqual({ id: 'media1', type: 'IMAGE', url: '/uploads/a.png' });
    expect(serviceMediaRepository.create).toHaveBeenCalledWith('svc1', { type: 'IMAGE', url: '/uploads/a.png' });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE_MEDIA', entityId: 'media1', action: 'CREATE' })
    );
  });

  it('resolves the parent service by slug when given a public slug', async () => {
    (serviceRepository.findBySlug as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.create as jest.Mock).mockResolvedValue({ id: 'media1', type: 'VIDEO', url: '/uploads/v.mp4' });

    await serviceMediaService.create('cctv-installation', { type: 'VIDEO', url: '/uploads/v.mp4' });

    expect(serviceMediaRepository.create).toHaveBeenCalledWith('svc1', { type: 'VIDEO', url: '/uploads/v.mp4' });
  });
});

describe('serviceMediaService.update', () => {
  it('rejects updating a non-existent gallery item', async () => {
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceMediaService.update('missing', { altText: 'New' })).rejects.toThrow('Gallery item not found');
  });

  it('updates metadata and records timeline + audit', async () => {
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue({ id: 'media1', altText: null });
    (serviceMediaRepository.update as jest.Mock).mockResolvedValue({ id: 'media1', altText: 'Front camera' });

    await serviceMediaService.update('media1', { altText: 'Front camera' }, 'admin1');

    expect(serviceMediaRepository.update).toHaveBeenCalledWith('media1', { altText: 'Front camera' });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE_MEDIA', entityId: 'media1', action: 'UPDATE' })
    );
  });
});

describe('serviceMediaService.setFeatured', () => {
  it('rejects a non-existent gallery item', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceMediaService.setFeatured('svc1', 'missing', 'admin1')).rejects.toThrow('Gallery item not found');
  });

  it('rejects an item that belongs to a different service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue({
      id: 'media1', serviceId: 'other-service', type: 'IMAGE',
    });
    await expect(serviceMediaService.setFeatured('svc1', 'media1', 'admin1')).rejects.toThrow('does not belong to this service');
  });

  it('features the item and records audit', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.findById as jest.Mock)
      .mockResolvedValueOnce({ id: 'media1', serviceId: 'svc1', type: 'IMAGE', isFeatured: false })
      .mockResolvedValue({ id: 'media1', serviceId: 'svc1', isFeatured: true });
    (serviceMediaRepository.setFeatured as jest.Mock).mockResolvedValue([{}, { id: 'media1', isFeatured: true }]);

    const result = await serviceMediaService.setFeatured('svc1', 'media1', 'admin1');

    expect(serviceMediaRepository.setFeatured).toHaveBeenCalledWith('svc1', 'media1');
    expect(result).toMatchObject({ id: 'media1', isFeatured: true });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE_MEDIA', entityId: 'media1', action: 'UPDATE' })
    );
  });
});

describe('serviceMediaService.toggleActive', () => {
  it('rejects a non-existent gallery item', async () => {
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceMediaService.toggleActive('missing')).rejects.toThrow('Gallery item not found');
  });

  it('hides an active item from the public site', async () => {
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue({ id: 'media1', isActive: true });
    (serviceMediaRepository.setActive as jest.Mock).mockResolvedValue({ id: 'media1', isActive: false });

    const result = await serviceMediaService.toggleActive('media1', 'admin1');

    expect(serviceMediaRepository.setActive).toHaveBeenCalledWith('media1', false);
    expect(result).toMatchObject({ id: 'media1', isActive: false });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE_MEDIA', entityId: 'media1', action: 'UPDATE' })
    );
  });
});

describe('serviceMediaService.remove', () => {
  it('rejects a non-existent gallery item', async () => {
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceMediaService.remove('missing')).rejects.toThrow('Gallery item not found');
  });

  it('hard-deletes the item and records timeline + audit', async () => {
    (serviceMediaRepository.findById as jest.Mock).mockResolvedValue({ id: 'media1', type: 'VIDEO' });
    (serviceMediaRepository.hardDelete as jest.Mock).mockResolvedValue({});

    const result = await serviceMediaService.remove('media1', 'admin1');

    expect(serviceMediaRepository.hardDelete).toHaveBeenCalledWith('media1');
    expect(result).toEqual({ id: 'media1', removed: true });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SERVICE_MEDIA', entityId: 'media1', action: 'DELETE' })
    );
  });
});

describe('serviceMediaService.listByService', () => {
  it('rejects listing gallery items for a non-existent service', async () => {
    await expect(serviceMediaService.listByService('bad-ref', true)).rejects.toThrow('Service not found');
  });

  it('returns items for a service, delegating the active filter to the repository', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.listByService as jest.Mock).mockResolvedValue([{ id: 'media1' }]);

    const result = await serviceMediaService.listByService('svc1', true);

    expect(result).toEqual([{ id: 'media1' }]);
    expect(serviceMediaRepository.listByService).toHaveBeenCalledWith('svc1', true);
  });
});

describe('serviceMediaService.reorder', () => {
  it('rejects reordering a non-existent service', async () => {
    await expect(serviceMediaService.reorder('bad-ref', ['media1'])).rejects.toThrow('Service not found');
  });

  it('rejects ids that do not belong to the service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.listByService as jest.Mock).mockResolvedValue([{ id: 'media1' }, { id: 'media2' }]);

    await expect(serviceMediaService.reorder('svc1', ['media1', 'media9'])).rejects.toThrow('does not belong to this service');
  });

  it('rejects duplicate ids', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);

    await expect(serviceMediaService.reorder('svc1', ['media1', 'media1'])).rejects.toThrow('duplicate');
  });

  it('persists the new order and records a timeline event', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(service);
    (serviceMediaRepository.listByService as jest.Mock).mockResolvedValue([{ id: 'media1' }, { id: 'media2' }]);
    (serviceMediaRepository.reorder as jest.Mock).mockResolvedValue([{}, {}]);

    const result = await serviceMediaService.reorder('svc1', ['media2', 'media1'], 'admin1');

    expect(serviceMediaRepository.reorder).toHaveBeenCalledWith(['media2', 'media1']);
    expect(result).toEqual({ orderedIds: ['media2', 'media1'] });
  });
});
