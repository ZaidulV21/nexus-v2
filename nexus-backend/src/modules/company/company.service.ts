import { companyRepository } from './company.repository';
import { UpdateCompanySettingsInput } from './company.types';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { clearBrandingCache } from './company.branding';

const ENTITY_TYPE = 'COMPANY_SETTING';
const ENTITY_ID = 'singleton';

export const companyService = {
  async get() {
    const settings = await companyRepository.find();
    if (!settings) {
      return companyRepository.create({});
    }
    return settings;
  },

  async update(input: UpdateCompanySettingsInput, actorUserId?: string) {
    const before = await companyRepository.find();

    const updated = await companyRepository.update(input);
    clearBrandingCache();

    await timelineService.recordEvent({
      entityType: ENTITY_TYPE,
      entityId: ENTITY_ID,
      eventType: 'COMPANY_SETTINGS_UPDATED',
      description: 'Company settings updated',
      actorUserId,
      metadata: { fields: Object.keys(input) },
    });

    await auditService.recordAudit({
      entityType: ENTITY_TYPE,
      entityId: ENTITY_ID,
      action: 'UPDATE',
      actorUserId,
      beforeState: before ? sanitizeForAudit(before) : undefined,
      afterState: sanitizeForAudit(updated),
    });

    return updated;
  },

  async updateField(field: string, fileUrl: string, actorUserId?: string) {
    const before = await companyRepository.find();

    const updated = await companyRepository.update({ [field]: fileUrl } as UpdateCompanySettingsInput);
    clearBrandingCache();

    await timelineService.recordEvent({
      entityType: ENTITY_TYPE,
      entityId: ENTITY_ID,
      eventType: 'COMPANY_FILE_UPLOADED',
      description: `Company ${field} uploaded`,
      actorUserId,
      metadata: { field, fileUrl },
    });

    await auditService.recordAudit({
      entityType: ENTITY_TYPE,
      entityId: ENTITY_ID,
      action: 'UPDATE',
      actorUserId,
      beforeState: before ? { [field]: (before as Record<string, unknown>)[field] } : undefined,
      afterState: { [field]: fileUrl },
    });

    return updated;
  },
};

function sanitizeForAudit(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue;
    out[k] = v;
  }
  return out;
}
