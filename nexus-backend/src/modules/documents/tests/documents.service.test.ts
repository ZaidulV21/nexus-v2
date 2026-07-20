jest.mock('../../../config/env', () => ({
  env: {
    nodeEnv: 'test',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
    cloudinaryFolder: 'nexus',
  },
}));
jest.mock('../documents.repository', () => ({
  documentsRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    listForEntity: jest.fn(),
    listForClient: jest.fn(),
    softDelete: jest.fn(),
  },
}));
jest.mock('../../../core/storage/localStorage.provider', () => ({
  localStorageProvider: { save: jest.fn(), getUrl: jest.fn() },
}));
jest.mock('../../lead/lead.repository', () => ({ leadRepository: { findById: jest.fn() } }));
jest.mock('../../project/project.repository', () => ({ projectRepository: { findById: jest.fn() } }));
jest.mock('../../timeline/timeline.service', () => ({ timelineService: { recordEvent: jest.fn() } }));

import { documentsRepository } from '../documents.repository';
import { localStorageProvider } from '../../../core/storage/localStorage.provider';
import { leadRepository } from '../../lead/lead.repository';
import { documentsService } from '../documents.service';

describe('documentsService.upload', () => {
  it('rejects a disallowed file type', async () => {
    await expect(
      documentsService.upload(
        {
          entityType: 'LEAD',
          entityId: 'lead1',
          documentType: 'IMAGE',
          fileName: 'malware.exe',
          buffer: Buffer.from('x'),
          mimeType: 'application/x-msdownload',
        },
        'admin1'
      )
    ).rejects.toThrow('is not allowed');
  });

  it('rejects an oversized file', async () => {
    const bigBuffer = Buffer.alloc(16 * 1024 * 1024);
    await expect(
      documentsService.upload(
        {
          entityType: 'LEAD',
          entityId: 'lead1',
          documentType: 'IMAGE',
          fileName: 'big.png',
          buffer: bigBuffer,
          mimeType: 'image/png',
        },
        'admin1'
      )
    ).rejects.toThrow('exceeds the maximum');
  });

  it('rejects upload against a non-existent Lead', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      documentsService.upload(
        {
          entityType: 'LEAD',
          entityId: 'missing-lead',
          documentType: 'IMAGE',
          fileName: 'photo.png',
          buffer: Buffer.from('x'),
          mimeType: 'image/png',
        },
        'admin1'
      )
    ).rejects.toThrow('Lead not found');
  });

  it('uploads successfully for a valid Lead-attached image', async () => {
    (leadRepository.findById as jest.Mock).mockResolvedValue({ id: 'lead1' });
    (localStorageProvider.save as jest.Mock).mockResolvedValue({ fileUrl: 'stored.png', fileSize: 100 });
    (documentsRepository.create as jest.Mock).mockResolvedValue({ id: 'doc1' });

    const result = await documentsService.upload(
      {
        entityType: 'LEAD',
        entityId: 'lead1',
        documentType: 'IMAGE',
        fileName: 'photo.png',
        buffer: Buffer.from('x'),
        mimeType: 'image/png',
      },
      'admin1'
    );
    expect(result.id).toBe('doc1');
  });
});
