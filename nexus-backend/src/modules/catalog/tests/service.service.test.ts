jest.mock('../service.repository', () => ({
  serviceRepository: {
    create: jest.fn(),
    update: jest.fn(),
    disable: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    getActiveQuestionnaire: jest.fn(),
  },
}));
jest.mock('../category.repository', () => ({
  categoryRepository: { findById: jest.fn() },
}));
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn() },
}));

import { serviceRepository } from '../service.repository';
import { categoryRepository } from '../category.repository';
import { serviceService } from '../service.service';

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

  it('creates a service and records a timeline event when the category exists', async () => {
    (categoryRepository.findById as jest.Mock).mockResolvedValue({ id: 'cat1', name: 'Technology' });
    (serviceRepository.create as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'CCTV' });

    const result = await serviceService.create({
      categoryId: 'cat1',
      name: 'CCTV',
      requiresSiteVisit: 'YES',
    });

    expect(result).toEqual({ id: 'svc1', name: 'CCTV' });
    expect(serviceRepository.create).toHaveBeenCalled();
  });
});

describe('serviceService.disable', () => {
  it('throws NotFoundError for a non-existent service', async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(serviceService.disable('missing-id')).rejects.toThrow('Service not found');
  });
});
