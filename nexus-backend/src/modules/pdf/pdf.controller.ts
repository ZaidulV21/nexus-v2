import { Request, Response, NextFunction } from 'express';
import { pdfService } from './pdf.service';
import { auditService } from '../audit/audit.service';
import { ok } from '../../core/utils/response';
import { UnauthorizedError, ValidationError } from '../../core/errors/AppError';
import { PdfDocumentType } from './pdf.types';

const VALID_DOCUMENT_TYPES = new Set(['QUOTATION', 'INVOICE', 'RECEIPT']);

export const pdfController = {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();

      const { documentType, documentId } = req.body;
      if (!documentType || !VALID_DOCUMENT_TYPES.has(documentType)) {
        throw new ValidationError('documentType must be QUOTATION, INVOICE, or RECEIPT');
      }
      if (!documentId) {
        throw new ValidationError('documentId is required');
      }

      const result = await pdfService.generate(
        documentType as PdfDocumentType,
        documentId,
        req.user.id
      );
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();

      const { documentType, documentId } = req.params;
      if (!VALID_DOCUMENT_TYPES.has(documentType)) {
        throw new ValidationError('documentType must be QUOTATION, INVOICE, or RECEIPT');
      }

      // Clients may only access documents they own (their invoice, quotation,
      // or payment receipt); admins may access any document. The ownership
      // check hides the existence of other clients' records (404, not 403).
      const pdfUrl = await pdfService.resolvePdfForViewer(
        documentType as PdfDocumentType,
        documentId,
        req.user
      );

      // PDF download is a SYSTEM event (viewing/rendering a document). It is
      // deliberately NOT recorded on the business timeline; the Audit Log
      // records PDF_DOWNLOADED (and PDF_GENERATED when a document is produced
      // on demand). Clients never see these - the Audit Log is admin-only.
      auditService.recordAudit({
        entityType: documentType.toUpperCase() as PdfDocumentType,
        entityId: documentId,
        action: 'PDF_DOWNLOADED',
        afterState: { pdfUrl },
        actorUserId: req.user.id,
      }).catch(() => {});

      return ok(res, { pdfUrl });
    } catch (err) {
      next(err);
    }
  },

  async regenerate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();

      const { documentType, documentId } = req.params;
      if (!VALID_DOCUMENT_TYPES.has(documentType)) {
        throw new ValidationError('documentType must be QUOTATION, INVOICE, or RECEIPT');
      }

      const result = await pdfService.generate(
        documentType as PdfDocumentType,
        documentId,
        req.user.id
      );
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
