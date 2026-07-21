import { runInTransaction } from '../../core/utils/transaction';
import { quotationRepository, quotationVersionRepository, CLIENT_VISIBLE_QUOTATION_STATUSES } from './quotation.repository';
import { leadRepository } from '../lead/lead.repository';
import { leadService } from '../lead/lead.service';
import { clientRepository } from '../client/client.repository';
import { serviceRepository } from '../catalog/service.repository';
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

// Every quotation line must reference a real catalog service. New quotations
// require the service to be selectable (active, non-archived); revisions of
// existing quotations may keep services that were archived since, so a live
// negotiation is never blocked by a catalog change.
async function assertItemServicesExist(items: QuotationItemInput[], requireSelectable: boolean) {
  const uniqueServiceIds = [...new Set(items.map((item) => item.serviceId))];
  for (const serviceId of uniqueServiceIds) {
    const service = await serviceRepository.findById(serviceId);
    if (!service) {
      throw new ValidationError(`Service ${serviceId} does not exist in the catalog`);
    }
    if (requireSelectable && (!service.isActive || service.archivedAt)) {
      throw new ValidationError(`Service "${service.name}" is not available for new quotations`);
    }
  }
}

function getActiveVersion(quotation: any) {
  return quotation.versions.find((version: any) => version.id === quotation.activeVersionId) ?? quotation.versions[0];
}

// The Lead Services a quotation covers = the distinct services on its
// active version's line items. Used to scope automatic Lead status updates
// to the services actually being quoted, per PRD 4.4 (independent
// per-service status).
function getQuotedServiceIds(quotation: any): string[] {
  const versions = quotation.versions ?? [];
  const activeVersion = versions.find((version: any) => version.id === quotation.activeVersionId) ?? versions[0];
  return [...new Set(((activeVersion?.items ?? []) as any[]).map((item) => item.serviceId).filter(Boolean))] as string[];
}

// Resolve the historical source Lead for workflow automation. Client-owned
// quotations are valid with leadId = null, so fall back to Client.sourceLeadId.
async function resolveSourceLeadId(quotation: any): Promise<string> {
  if (quotation.leadId) return quotation.leadId;
  if (quotation.client?.sourceLeadId) return quotation.client.sourceLeadId;
  if (quotation.lead?.id) return quotation.lead.id;
  if (quotation.clientId) {
    const client = await clientRepository.findById(quotation.clientId);
    if (client?.sourceLeadId) return client.sourceLeadId;
    throw new ValidationError('Client has no source Lead - cannot synchronize quotation workflow');
  }
  throw new ValidationError('Quotation has no Lead or Client owner');
}

export const quotationService = {
  async create(input: CreateQuotationInput, actorUserId: string) {
    // Single workflow: Quotations are created ONLY for Clients.
    // Lead must be converted to a Client before quotation creation.
    if (!input.clientId) {
      throw new ValidationError(
        'Quotations must be created for Clients. Convert the Lead to a Client first.'
      );
    }

    // Verify the Client exists and is traceable to a source Lead
    // (needed for automatic Lead Service status updates)
    const client = await clientRepository.findById(input.clientId);
    if (!client) throw new NotFoundError('Client not found');
    if (!client.sourceLeadId) {
      throw new ValidationError('Client has no source Lead - cannot create quotation');
    }

    await assertItemServicesExist(input.items, true);

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
      // Check if this is the first quotation for this Client (via source Lead)
      const isFirstQuotationForLead = client.sourceLeadId
        ? (await quotationRepository.countForLead(client.sourceLeadId, tx)) === 0
        : false;
      const quotationNumber = await quotationRepository.generateQuotationNumber(tx);
      const quotation = await quotationRepository.create(
        { quotationNumber, leadId: null, clientId: input.clientId },
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

      return { quotation, version, isFirstQuotationForLead };
    });

    // Lead pipeline automation: creating the FIRST quotation for a Client
    // (via source Lead) moves its quoted Lead Services from QUOTE PREPARING to QUOTE SENT.
    // Services still earlier in the pipeline are left alone, and subsequent
    // quotations don't re-trigger the move - re-sends are handled by send().
    // This keeps Lead Services synchronized even after conversion.
    if (client.sourceLeadId && result.isFirstQuotationForLead) {
      await leadService.applyQuotationWorkflowStatus(
        client.sourceLeadId,
        input.items.map((item) => item.serviceId),
        'QUOTE SENT',
        actorUserId,
        { onlyFromStatus: 'QUOTE PREPARING' }
      );
    }

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

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('QUOTATION', result.quotation.id, actorUserId).catch(() => {});
    });

    return quotationRepository.findById(result.quotation.id);
  },

  // Never mutates an existing version - always inserts a new one and flips
  // is_active atomically. Old versions remain permanently readable.
  async revise(quotationId: string, input: ReviseQuotationInput, actorUserId: string) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');

    await assertItemServicesExist(input.items, false);

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

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('QUOTATION', quotationId, actorUserId).catch(() => {});
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

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('QUOTATION', version.quotationId, actorUserId).catch(() => {});
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

    const sourceLeadId = await resolveSourceLeadId(quotation);
    const statusBefore = quotation.status;
    await runInTransaction(async (tx) => {
      await quotationRepository.updateStatus(quotationId, 'SENT', tx);
    });

    // Lead pipeline automation: sending (or re-sending after a rejection)
    // moves the quoted Lead Services to QUOTE SENT.
    await leadService.applyQuotationWorkflowStatus(
      sourceLeadId,
      getQuotedServiceIds(quotation),
      'QUOTE SENT',
      actorUserId
    );

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
      payload: { quotationId, quotationNumber: quotation.quotationNumber, resend, clientId: quotation.clientId },
    });

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('QUOTATION', quotationId, actorUserId).catch(() => {});
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
    const sourceLeadId = await resolveSourceLeadId(quotation);

    await runInTransaction(async (tx) => {
      await quotationRepository.updateStatus(quotationId, 'NEGOTIATION', tx);
    });

    // Lead pipeline automation: a client revision request re-opens
    // negotiation on the quoted Lead Services.
    await leadService.applyQuotationWorkflowStatus(
      sourceLeadId,
      getQuotedServiceIds(quotation),
      'NEGOTIATION',
      actorUserId
    );

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

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('QUOTATION', quotationId, actorUserId).catch(() => {});
    });

    return quotationRepository.findById(quotationId);
  },

  async accept(quotationId: string, clientId: string) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');
    if (quotation.status !== 'SENT') {
      throw new ValidationError('Only sent quotations can be accepted');
    }

    const quotationClientId = (quotation as any).clientId ?? (quotation as any).lead?.client?.id;
    if (!quotationClientId || quotationClientId !== clientId) {
      throw new ValidationError('Quotation does not belong to this Client');
    }

    const activeVersion = getActiveVersion(quotation);
    if (!activeVersion || !activeVersion.approvals?.length) {
      throw new ValidationError('Only internally approved quotation versions can be accepted');
    }

    const sourceLeadId = await resolveSourceLeadId(quotation);

    // Lead pipeline automation: client acceptance moves the quoted Lead
    // Services to APPROVED. Project creation below then advances them to
    // PROJECT CREATED (inside projectService.create).
    await leadService.applyQuotationWorkflowStatus(
      sourceLeadId,
      getQuotedServiceIds(quotation),
      'APPROVED',
      clientId
    );

    // Project creation and the quotation status flip are one atomic unit:
    // the status update runs inside project.create's transaction, so if
    // either write fails, neither is persisted.
    const project = await projectService.create(
      {
        leadId: sourceLeadId,
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
      payload: { quotationId, projectId: project.id, clientId: quotationClientId },
    });

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('QUOTATION', quotationId, clientId).catch(() => {});
    });

    return { quotation: await quotationRepository.findById(quotationId), project };
  },

  async reject(quotationId: string, clientId: string, reason?: string) {
    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) throw new NotFoundError('Quotation not found');

    const quotationClientId = (quotation as any).clientId ?? (quotation as any).lead?.client?.id;
    if (!quotationClientId || quotationClientId !== clientId) {
      throw new ValidationError('Quotation does not belong to this Client');
    }

    if (quotation.status !== 'SENT' && quotation.status !== 'NEGOTIATION') {
      throw new ValidationError('Only sent quotations can be rejected');
    }

    const sourceLeadId = await resolveSourceLeadId(quotation);

    await quotationRepository.updateStatus(quotationId, 'REJECTED');

    // Lead pipeline automation: a rejection sends the quoted Lead Services
    // back into NEGOTIATION so the Admin can revise and re-send.
    await leadService.applyQuotationWorkflowStatus(
      sourceLeadId,
      getQuotedServiceIds(quotation),
      'NEGOTIATION',
      clientId
    );

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

    import('../pdf/pdf.service').then(({ pdfService }) => {
      pdfService.generate('QUOTATION', quotationId, clientId).catch(() => {});
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
    const quotationClientId = (quotation as any).clientId ?? (quotation as any).lead?.client?.id;
    if (!quotationClientId || quotationClientId !== clientId) {
      throw new ValidationError('Quotation does not belong to this Client');
    }
    // DRAFT / APPROVED are internal states - the quotation only exists for
    // the client once the admin has clicked "Send". 404 (not 403) so the
    // portal can't even confirm an unsent quotation exists.
    if (!CLIENT_VISIBLE_QUOTATION_STATUSES.includes(quotation.status)) {
      throw new NotFoundError('Quotation not found');
    }
    return quotation;
  },
};
