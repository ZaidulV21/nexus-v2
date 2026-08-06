jest.mock('../projectMedia.repository', () => ({
  projectMediaRepository: {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    listByProject: jest.fn(),
    reorder: jest.fn(),
    setFeatured: jest.fn(),
    setActive: jest.fn(),
    hardDelete: jest.fn(),
  },
}));
jest.mock('../project.repository', () => ({
  projectRepository: {
    findById: jest.fn(),
    setCompleted: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../../timeline/timeline.service', () => ({
  timelineService: { recordEvent: jest.fn() },
}));
jest.mock('../../audit/audit.service', () => ({
  auditService: { recordAudit: jest.fn() },
}));

import { projectMediaRepository } from '../projectMedia.repository';
import { projectRepository } from '../project.repository';
import { auditService } from '../../audit/audit.service';
import { timelineService } from '../../timeline/timeline.service';
import { projectMediaService } from '../projectMedia.service';

const completedProject = {
  id: 'proj1',
  projectNumber: 'P-00001',
  title: null,
  deletedAt: null,
  completedAt: new Date('2026-08-01T00:00:00Z'),
};

const uncompletedProject = {
  id: 'proj1',
  projectNumber: 'P-00001',
  deletedAt: null,
  completedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (projectRepository.findById as jest.Mock).mockResolvedValue(null);
});

describe('projectMediaService.create', () => {
  it('rejects adding completion media to a non-existent project', async () => {
    await expect(
      projectMediaService.create('missing', { type: 'IMAGE', url: '/uploads/a.png' })
    ).rejects.toThrow('Project not found');
  });

  it('rejects adding completion media before the project is completed', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(uncompletedProject);
    await expect(
      projectMediaService.create('proj1', { type: 'IMAGE', url: '/uploads/a.png' })
    ).rejects.toThrow('only be added after the project is marked complete');
  });

  it('creates a document item on a completed project and records timeline + audit', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(completedProject);
    (projectMediaRepository.create as jest.Mock).mockResolvedValue({
      id: 'media1',
      type: 'DOCUMENT',
      url: '/uploads/handover.pdf',
      fileName: 'handover.pdf',
    });

    const result = await projectMediaService.create(
      'proj1',
      { type: 'DOCUMENT', url: '/uploads/handover.pdf', fileName: 'handover.pdf' },
      'admin1'
    );

    expect(projectMediaRepository.create).toHaveBeenCalledWith('proj1', {
      type: 'DOCUMENT',
      url: '/uploads/handover.pdf',
      fileName: 'handover.pdf',
    });
    expect(result.type).toBe('DOCUMENT');
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'PROJECT_MEDIA', entityId: 'media1', eventType: 'PROJECT_MEDIA_ADDED' })
    );
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'PROJECT_MEDIA', entityId: 'media1', action: 'CREATE' })
    );
  });
});

describe('projectMediaService.update', () => {
  it('rejects updating a non-existent media item', async () => {
    (projectMediaRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(projectMediaService.update('missing', { caption: 'New' })).rejects.toThrow('Project media not found');
  });

  it('updates metadata and records timeline + audit', async () => {
    (projectMediaRepository.findById as jest.Mock).mockResolvedValue({ id: 'media1', caption: null });
    (projectMediaRepository.update as jest.Mock).mockResolvedValue({ id: 'media1', caption: 'Handover day' });

    await projectMediaService.update('media1', { caption: 'Handover day' }, 'admin1');

    expect(projectMediaRepository.update).toHaveBeenCalledWith('media1', { caption: 'Handover day' });
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'PROJECT_MEDIA', entityId: 'media1', action: 'UPDATE' })
    );
  });
});

describe('projectMediaService.setFeatured', () => {
  it('rejects a media item that belongs to a different project', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(completedProject);
    (projectMediaRepository.findById as jest.Mock).mockResolvedValue({
      id: 'media1',
      projectId: 'proj-other',
      type: 'IMAGE',
    });

    await expect(projectMediaService.setFeatured('proj1', 'media1', 'admin1')).rejects.toThrow(
      'does not belong to this project'
    );
  });

  it('clears the previous featured item and sets the target (via the repository)', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(completedProject);
    (projectMediaRepository.findById as jest.Mock).mockResolvedValue({
      id: 'media1',
      projectId: 'proj1',
      type: 'VIDEO',
      isFeatured: false,
    });

    await projectMediaService.setFeatured('proj1', 'media1', 'admin1');

    expect(projectMediaRepository.setFeatured).toHaveBeenCalledWith('proj1', 'media1');
  });
});

describe('projectMediaService.toggleActive', () => {
  it('flips visibility and records an UPDATE audit', async () => {
    (projectMediaRepository.findById as jest.Mock).mockResolvedValue({
      id: 'media1',
      projectId: 'proj1',
      type: 'IMAGE',
      isActive: true,
    });
    (projectMediaRepository.setActive as jest.Mock).mockResolvedValue({
      id: 'media1',
      isActive: false,
    });

    const result = await projectMediaService.toggleActive('media1', 'admin1');

    expect(result.isActive).toBe(false);
    expect(projectMediaRepository.setActive).toHaveBeenCalledWith('media1', false);
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'PROJECT_MEDIA', entityId: 'media1', action: 'UPDATE' })
    );
  });
});

describe('projectMediaService.remove', () => {
  it('hard-deletes a media item and returns { removed: true }', async () => {
    (projectMediaRepository.findById as jest.Mock).mockResolvedValue({
      id: 'media1',
      projectId: 'proj1',
      type: 'DOCUMENT',
      fileName: 'handover.pdf',
    });

    const result = await projectMediaService.remove('media1', 'admin1');

    expect(projectMediaRepository.hardDelete).toHaveBeenCalledWith('media1');
    expect(result).toEqual({ id: 'media1', removed: true });
    expect(timelineService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'PROJECT_MEDIA_REMOVED' })
    );
  });
});

describe('projectMediaService.listByProject', () => {
  it('resolves the project before listing media', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(completedProject);
    (projectMediaRepository.listByProject as jest.Mock).mockResolvedValue([
      { id: 'media1', type: 'IMAGE', isActive: true },
    ]);

    const result = await projectMediaService.listByProject('proj1', false);

    expect(projectMediaRepository.listByProject).toHaveBeenCalledWith('proj1', false);
    expect(result).toHaveLength(1);
  });

  it('rejects listing media for a non-existent project', async () => {
    await expect(projectMediaService.listByProject('missing', false)).rejects.toThrow('Project not found');
  });
});

describe('projectMediaService.reorder', () => {
  it('rejects reorder before the project is completed', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(uncompletedProject);
    await expect(projectMediaService.reorder('proj1', ['media1'])).rejects.toThrow(
      'only be added after the project is marked complete'
    );
  });

  it('applies the ordered ids when they all belong to the project', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(completedProject);
    (projectMediaRepository.listByProject as jest.Mock).mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
    ]);

    const result = await projectMediaService.reorder('proj1', ['b', 'a'], 'admin1');

    expect(projectMediaRepository.reorder).toHaveBeenCalledWith(['b', 'a']);
    expect(result).toEqual({ orderedIds: ['b', 'a'] });
  });

  it('rejects an id that does not belong to the project', async () => {
    (projectRepository.findById as jest.Mock).mockResolvedValue(completedProject);
    (projectMediaRepository.listByProject as jest.Mock).mockResolvedValue([{ id: 'a' }]);

    await expect(projectMediaService.reorder('proj1', ['a', 'unknown'])).rejects.toThrow(
      'does not belong to this project'
    );
  });
});
