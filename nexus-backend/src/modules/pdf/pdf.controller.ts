import { Request, Response, NextFunction } from 'express';
import { pdfService } from './pdf.service';
import { ok } from '../../core/utils/response';
import { UnauthorizedError, ValidationError } from '../../core/errors/AppError';
import { PdfDocumentType } from './pdf.types';
import { timelineService } from '../timeline/timeline.service';

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

      const pdfUrl = await pdfService.getOrCreate(
        documentType as PdfDocumentType,
        documentId
      );

      if (documentType !== 'RECEIPT') {
        await timelineService.recordEvent({
          entityType: documentType as PdfDocumentType,
          entityId: documentId,
          eventType: `${documentType}_PDF_DOWNLOADED`,
          description: `PDF downloaded for ${documentType.toLowerCase()} ${documentId}`,
          actorUserId: req.user.id,
        });
      }

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
