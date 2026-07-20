import { Request, Response, NextFunction } from 'express';
import { companyService } from './company.service';
import { updateCompanySettingsSchema } from './company.validation';
import { ok } from '../../core/utils/response';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';
import { localStorageProvider } from '../../core/storage/localStorage.provider';
import { cloudinaryProvider } from '../../core/storage/cloudinary.provider';
import { env } from '../../config/env';

const storageProvider = env.cloudinaryCloudName ? cloudinaryProvider : localStorageProvider;

const ALLOWED_UPLOAD_FIELDS = new Set([
  'logoUrl',
  'faviconUrl',
  'qrCodeUrl',
  'companySignatureUrl',
  'companyStampUrl',
]);

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const companyController = {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await companyService.get();
      return ok(res, settings);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can update company settings');
      }

      const parsed = updateCompanySettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid payload', parsed.error.flatten());
      }

      const settings = await companyService.update(parsed.data, req.user.id);
      return ok(res, settings);
    } catch (err) {
      next(err);
    }
  },

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can upload company files');
      }

      const field = req.query.field as string;
      if (!field || !ALLOWED_UPLOAD_FIELDS.has(field)) {
        throw new ValidationError(`Invalid upload field. Allowed: ${[...ALLOWED_UPLOAD_FIELDS].join(', ')}`);
      }

      const file = req.file;
      if (!file) {
        throw new ValidationError('No file provided');
      }

      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new ValidationError(`File type ${file.mimetype} is not allowed`);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError('File exceeds the maximum allowed size of 5MB');
      }

      const stored = await storageProvider.save(file.originalname, file.buffer, file.mimetype);
      const fileUrl = env.cloudinaryCloudName ? stored.fileUrl : `/uploads/${stored.fileUrl}`;
      const settings = await companyService.updateField(field, fileUrl, req.user.id);

      return ok(res, { fileUrl, settings });
    } catch (err) {
      next(err);
    }
  },
};
