import { companyService } from '../company.service';
import { companyRepository } from '../company.repository';
import { timelineService } from '../../timeline/timeline.service';
import { auditService } from '../../audit/audit.service';

jest.mock('../company.repository');
jest.mock('../../timeline/timeline.service');
jest.mock('../../audit/audit.service');

const mockRepository = jest.mocked(companyRepository);
const mockTimeline = jest.mocked(timelineService);
const mockAudit = jest.mocked(auditService);

const mockSettings = {
  id: 'singleton',
  companyName: 'Test Corp',
  legalBusinessName: 'Test Corp Pvt Ltd',
  gstNumber: '27AABCU9603R1ZM',
  panNumber: 'AABCU9603R',
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  dateFormat: 'dd/MM/yyyy',
  invoicePrefix: 'INV',
  quotationPrefix: 'QUO',
  projectPrefix: 'PRJ',
  clientPrefix: 'CLI',
  leadPrefix: 'LD',
  defaultGstPercent: 18,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('companyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('returns existing settings', async () => {
      mockRepository.find.mockResolvedValue(mockSettings as any);

      const result = await companyService.get();

      expect(result).toEqual(mockSettings);
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('creates default settings if none exist', async () => {
      mockRepository.find.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockSettings as any);

      const result = await companyService.get();

      expect(mockRepository.create).toHaveBeenCalledWith({});
      expect(result).toEqual(mockSettings);
    });
  });

  describe('update', () => {
    it('updates settings and records timeline + audit', async () => {
      const before = { ...mockSettings };
      const after = { ...mockSettings, companyName: 'New Corp' };

      mockRepository.find.mockResolvedValue(before as any);
      mockRepository.update.mockResolvedValue(after as any);
      mockTimeline.recordEvent.mockResolvedValue(undefined as any);
      mockAudit.recordAudit.mockResolvedValue(undefined as any);

      const result = await companyService.update({ companyName: 'New Corp' }, 'admin-1');

      expect(result.companyName).toBe('New Corp');
      expect(mockTimeline.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'COMPANY_SETTING',
          eventType: 'COMPANY_SETTINGS_UPDATED',
          actorUserId: 'admin-1',
        })
      );
      expect(mockAudit.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'COMPANY_SETTING',
          action: 'UPDATE',
          actorUserId: 'admin-1',
        })
      );
    });

    it('records audit with before/after state', async () => {
      const before = { ...mockSettings, companyName: 'Old Corp' };
      const after = { ...mockSettings, companyName: 'New Corp' };

      mockRepository.find.mockResolvedValue(before as any);
      mockRepository.update.mockResolvedValue(after as any);
      mockTimeline.recordEvent.mockResolvedValue(undefined as any);
      mockAudit.recordAudit.mockResolvedValue(undefined as any);

      await companyService.update({ companyName: 'New Corp' }, 'admin-1');

      const auditCall = mockAudit.recordAudit.mock.calls[0][0];
      expect(auditCall.beforeState).toEqual(expect.objectContaining({ companyName: 'Old Corp' }));
      expect(auditCall.afterState).toEqual(expect.objectContaining({ companyName: 'New Corp' }));
    });
  });

  describe('updateField', () => {
    it('updates a single file field and records timeline + audit', async () => {
      const before = { ...mockSettings, logoUrl: null };
      const after = { ...mockSettings, logoUrl: 'logo-abc.png' };

      mockRepository.find.mockResolvedValue(before as any);
      mockRepository.update.mockResolvedValue(after as any);
      mockTimeline.recordEvent.mockResolvedValue(undefined as any);
      mockAudit.recordAudit.mockResolvedValue(undefined as any);

      const result = await companyService.updateField('logoUrl', 'logo-abc.png', 'admin-1');

      expect((result as any).logoUrl).toBe('logo-abc.png');
      expect(mockTimeline.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COMPANY_FILE_UPLOADED',
          metadata: { field: 'logoUrl', fileUrl: 'logo-abc.png' },
        })
      );
    });
  });
});
