import { Request, Response, NextFunction } from 'express';
import { documentsService } from './documents.service';
import { uploadDocumentMetaSchema } from './documents.validation';
import { ok, created } from '../../core/utils/response';
import { ValidationError, UnauthorizedError, ForbiddenError } from '../../core/errors/AppError';

export const documentsController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      if (req.user.type !== 'ADMIN') {
        // V1 rule: Admin uploads only, clients have read/download access.
        throw new ForbiddenError('Only Admin may upload documents in V1');
      }
      const parsed = uploadDocumentMetaSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid document metadata', parsed.error.flatten());
      const file = (req as any).file;
      if (!file) throw new ValidationError('No file was uploaded');

      const document = await documentsService.upload(
        {
          ...parsed.data,
          fileName: file.originalname,
          buffer: file.buffer,
          mimeType: file.mimetype,
        },
        req.user.id
      );
      return created(res, document);
    } catch (err) {
      next(err);
    }
  },

  async listForEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityType, entityId } = req.query as { entityType: 'LEAD' | 'PROJECT'; entityId: string };
      if (!entityType || !entityId) throw new ValidationError('entityType and entityId are required');
      const docs = await documentsService.listForEntity(entityType, entityId);
      return ok(res, docs);
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await documentsService.getDownloadUrl(req.params.id);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await documentsService.softDelete(req.params.id, req.user?.id);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
