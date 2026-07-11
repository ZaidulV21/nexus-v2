import { runInTransaction } from '../../core/utils/transaction';
import { quotationRepository, quotationVersionRepository } from './quotation.repository';
import { leadRepository } from '../lead/lead.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { CreateQuotationInput, ReviseQuotationInput, ApproveQuotationInput, QuotationItemInput } from './quotation.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';

// Grand total is always server-calculated from line items - client input for
// totals is never trusted.
function computeTotals(items: QuotationItemInput[], discount: number, transportation: number, installation: number) {
  let subtotal = 0;
  let gstAmount = 0;
  const computedItems = items.map((item) => {
    const lineBase = item.quantity * item.unitPrice;
    const taxAmount = (lineBase * item.taxRate) / 100;
    const lineTotal = lineBase + taxAmount;
    subtotal += lineBase;
    gstAmount += taxAmount;
    return {
      serviceId: item.serviceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      taxAmount,
      lineTotal,
    };
  });
  const grandTotal = subtotal + gstAmount + transportation + installation - discount;
  return { computedItems, subtotal, gstAmount, grandTotal };
}

export const quotationService = {
  async create(input: CreateQuotationInput, actorUserId: string) {
    const lead = await leadRepository.findById(input.leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const discount = input.discount || 0;
    const transportation = input.transportation || 0;
    const installation = input.installation || 0;
    const { computedItems, subtotal, gstAmount, grandTotal } = computeTotals(
      input.items,
      discount,
      transportation,
      installation
    );

    const result = await runInTransaction(async (tx) => {
      const quotationNumber = await quotationRepository.generateQuotationNumber(tx);
      const quotation = await quotationRepository.create(
        { quotationNumber, leadId: input.leadId, clientId: input.clientId },
        tx
      );

      const version = await quotationVersionRepository.create(
        {
          quotationId: quotation.id,
          versionNumber: 1,
          subtotal,
          discount,
          gstAmount,
          transportation,
          installation,
          grandTotal,
          createdByUserId: actorUserId,
        },
        tx
      );

      await quotationVersionRepository.createItems(version.id, computedItems, tx);
      await quotationRepository.setActiveVersion(quotation.id, version.id, tx);

      return { quotation, version };
    });

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: result.quotation.id,
      eventType: 'QUOTATION_CREATED',
      description: `Quotation ${result.quotation.quotationNumber} created (v1), total ${grandTotal}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'QUOTATION',
      entityId: result.quotation.id,
      action: 'CREATE',
      afterState: result,
      actorUserId,
    });

    return quotationRepository.findById(result.quotation.id);
  },

  // Never mutates an existing version - always inserts a new one and flips
  // is_active atomically. Old versions remain permanently readable.
  async revise(quotationId: string, input: ReviseQuotationInput, actorUserId: string) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');

    const discount = input.discount || 0;
    const transportation = input.transportation || 0;
    const installation = input.installation || 0;
    const { computedItems, subtotal, gstAmount, grandTotal } = computeTotals(
      input.items,
      discount,
      transportation,
      installation
    );

    const newVersion = await runInTransaction(async (tx) => {
      const versionCount = await quotationVersionRepository.countVersions(quotationId, tx);
      await quotationVersionRepository.deactivateAllForQuotation(quotationId, tx);

      const version = await quotationVersionRepository.create(
        {
          quotationId,
          versionNumber: versionCount + 1,
          subtotal,
          discount,
          gstAmount,
          transportation,
          installation,
          grandTotal,
          createdByUserId: actorUserId,
        },
        tx
      );

      await quotationVersionRepository.createItems(version.id, computedItems, tx);
      await quotationRepository.setActiveVersion(quotationId, version.id, tx);

      return version;
    });

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: quotationId,
      eventType: 'QUOTATION_REVISED',
      description: `Quotation revised to v${newVersion.versionNumber}, new total ${grandTotal}`,
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'quotation.sent',
      entityType: 'QUOTATION',
      entityId: quotationId,
      recipient: 'client-on-file',
      payload: { quotationId, version: newVersion.versionNumber, grandTotal },
    });

    return quotationRepository.findById(quotationId);
  },

  async approve(quotationVersionId: string, input: ApproveQuotationInput, actorUserId: string) {
    const version = await quotationVersionRepository.findById(quotationVersionId);
    if (!version) throw new NotFoundError('Quotation version not found');
    if (!version.isActive) {
      throw new ValidationError('Only the active version of a quotation can be approved');
    }

    await quotationVersionRepository.createApproval({
      quotationVersionId,
      approvedByUserId: actorUserId,
      approvalMethod: input.approvalMethod,
    });

    await quotationRepository.updateStatus(version.quotationId, 'APPROVED');

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: version.quotationId,
      eventType: 'QUOTATION_APPROVED',
      description: `Quotation approved via ${input.approvalMethod}`,
      actorUserId,
      metadata: { approvalMethod: input.approvalMethod, approvedByUserId: actorUserId },
    });

    return quotationRepository.findById(version.quotationId);
  },

  async getById(id: string) {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) throw new NotFoundError('Quotation not found');
    return quotation;
  },

  async list(pagination: any) {
    return quotationRepository.list(pagination);
  },

  async listForClient(clientId: string, pagination: any) {
    return quotationRepository.listForClient(clientId, pagination);
  },
};
