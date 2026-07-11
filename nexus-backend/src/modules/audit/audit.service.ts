import { auditRepository } from './audit.repository';
import { RecordAuditInput } from './audit.types';

// The single function every other module's service layer calls at the
// "Audit Log" step of the mandatory action lifecycle.
export const auditService = {
  async recordAudit(input: RecordAuditInput) {
    return auditRepository.create(input);
  },

  async getAuditFor(entityType: string, entityId: string) {
    return auditRepository.listForEntity(entityType, entityId);
  },
};
