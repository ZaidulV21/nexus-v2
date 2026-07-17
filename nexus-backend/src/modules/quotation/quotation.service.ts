import { runInTransaction } from '../../core/utils/transaction';
import { quotationRepository, quotationVersionRepository } from './quotation.repository';
import { leadRepository } from '../lead/lead.repository';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { projectService } from '../project/project.service';
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

function getQuotationRecipient(quotation: any) {
  return quotation.client?.email ?? quotation.lead?.email ?? null;
}

function getActiveVersion(quotation: any) {
  return quotation.versions.find((version: any) => version.id === quotation.activeVersionId) ?? quotation.versions[0];
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
      await quotationRepository.updateStatus(quotationId, 'DRAFT', tx);

      return version;
    });

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: quotationId,
      eventType: 'QUOTATION_REVISED',
      description: `Quotation revised to v${newVersion.versionNumber}, new total ${grandTotal}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'QUOTATION',
      entityId: quotationId,
      action: 'REVISE',
      beforeState: { activeVersionId: quotation.activeVersionId, status: quotation.status },
      afterState: { activeVersionId: newVersion.id, status: 'DRAFT', versionNumber: newVersion.versionNumber },
      actorUserId,
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

  async send(quotationId: string, actorUserId: string, resend = false) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');
    if (quotation.status !== 'APPROVED' && quotation.status !== 'SENT') {
      throw new ValidationError('Only approved quotations can be sent to the client');
    }

    const recipient = getQuotationRecipient(quotation);
    if (!recipient) throw new ValidationError('Quotation has no client email recipient');

    const statusBefore = quotation.status;
    await runInTransaction(async (tx) => {
      await quotationRepository.updateStatus(quotationId, 'SENT', tx);
    });

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: quotationId,
      eventType: resend ? 'QUOTATION_RESENT' : 'QUOTATION_SENT',
      description: `Quotation ${quotation.quotationNumber} ${resend ? 'resent' : 'sent'} to client`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'QUOTATION',
      entityId: quotationId,
      action: resend ? 'RESEND' : 'SEND',
      beforeState: { status: statusBefore },
      afterState: { quotationId, recipient, status: 'SENT' },
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'quotation.sent',
      entityType: 'QUOTATION',
      entityId: quotationId,
      recipient,
      payload: { quotationId, quotationNumber: quotation.quotationNumber, resend },
    });

    return quotationRepository.findById(quotationId);
  },

  async requestRevision(quotationId: string, actorUserId: string, reason: string) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');
    if (quotation.status !== 'SENT') {
      throw new ValidationError('Only sent quotations can request a revision');
    }

    const recipient = 'admin-on-file';

    await runInTransaction(async (tx) => {
      await quotationRepository.updateStatus(quotationId, 'NEGOTIATION', tx);
    });

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: quotationId,
      eventType: 'QUOTATION_REVISION_REQUESTED',
      description: `Revision requested for quotation ${quotation.quotationNumber}: ${reason}`,
      actorUserId,
      metadata: { reason },
    });

    await auditService.recordAudit({
      entityType: 'QUOTATION',
      entityId: quotationId,
      action: 'REVISION_REQUEST',
      beforeState: { status: quotation.status },
      afterState: { status: 'NEGOTIATION', reason },
      actorUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'quotation.revision_requested',
      entityType: 'QUOTATION',
      entityId: quotationId,
      recipient,
      payload: { quotationId, quotationNumber: quotation.quotationNumber, reason },
    });

    return quotationRepository.findById(quotationId);
  },

  async accept(quotationId: string, clientId: string) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');
    if (quotation.status !== 'SENT') {
      throw new ValidationError('Only sent quotations can be accepted');
    }

    const quotationClientId = quotation.clientId ?? quotation.lead?.client?.id;
    if (!quotationClientId || quotationClientId !== clientId) {
      throw new ValidationError('Quotation does not belong to this Client');
    }

    const activeVersion = getActiveVersion(quotation);
    if (!activeVersion || !activeVersion.approvals?.length) {
      throw new ValidationError('Only internally approved quotation versions can be accepted');
    }

    // Project creation and the quotation status flip are one atomic unit:
    // the status update runs inside project.create's transaction, so if
    // either write fails, neither is persisted.
    const project = await projectService.create(
      {
        leadId: quotation.leadId,
        clientId,
        quotationVersionId: activeVersion.id,
      },
      clientId,
      async (tx) => {
        await quotationRepository.updateStatus(quotationId, 'ACCEPTED', tx);
      }
    );

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: quotationId,
      eventType: 'QUOTATION_ACCEPTED',
      description: `Quotation ${quotation.quotationNumber} accepted by client`,
      actorUserId: clientId,
      metadata: { projectId: project.id },
    });

    await auditService.recordAudit({
      entityType: 'QUOTATION',
      entityId: quotationId,
      action: 'CLIENT_ACCEPT',
      beforeState: { status: quotation.status },
      afterState: { quotationId, projectId: project.id, status: 'ACCEPTED' },
      actorUserId: clientId,
    });

    await notificationsService.emitEvent({
      eventType: 'quotation.accepted',
      entityType: 'QUOTATION',
      entityId: quotationId,
      recipient: 'admin-on-file',
      payload: { quotationId, projectId: project.id },
    });

    return { quotation: await quotationRepository.findById(quotationId), project };
  },

  async reject(quotationId: string, clientId: string, reason?: string) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');

    const quotationClientId = quotation.clientId ?? quotation.lead?.client?.id;
    if (!quotationClientId || quotationClientId !== clientId) {
      throw new ValidationError('Quotation does not belong to this Client');
    }

    if (quotation.status !== 'SENT' && quotation.status !== 'NEGOTIATION') {
      throw new ValidationError('Only sent quotations can be rejected');
    }

    await quotationRepository.updateStatus(quotationId, 'REJECTED');

    await timelineService.recordEvent({
      entityType: 'QUOTATION',
      entityId: quotationId,
      eventType: 'QUOTATION_REJECTED',
      description: `Quotation ${quotation.quotationNumber} rejected by client${reason ? `: ${reason}` : ''}`,
      actorUserId: clientId,
    });

    await auditService.recordAudit({
      entityType: 'QUOTATION',
      entityId: quotationId,
      action: 'CLIENT_REJECT',
      beforeState: { status: quotation.status },
      afterState: { status: 'REJECTED', reason },
      actorUserId: clientId,
    });

    await notificationsService.emitEvent({
      eventType: 'quotation.rejected',
      entityType: 'QUOTATION',
      entityId: quotationId,
      recipient: 'admin-on-file',
      payload: { quotationId, reason },
    });

    return quotationRepository.findById(quotationId);
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

  async getForClient(id: string, clientId: string) {
    const quotation = await quotationRepository.findById(id);
    if (!quotation) throw new NotFoundError('Quotation not found');
    const quotationClientId = quotation.clientId ?? quotation.lead?.client?.id;
    if (!quotationClientId || quotationClientId !== clientId) {
      throw new ValidationError('Quotation does not belong to this Client');
    }
    return quotation;
  },
};
