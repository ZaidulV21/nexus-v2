import { Request, Response, NextFunction } from 'express';
import { serviceService } from './service.service';
import { createServiceSchema, updateServiceSchema, serviceListFiltersSchema } from './service.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';
import { localStorageProvider } from '../../core/storage/localStorage.provider';
import { cloudinaryProvider } from '../../core/storage/cloudinary.provider';
import { env } from '../../config/env';

const storageProvider = env.cloudinaryCloudName ? cloudinaryProvider : localStorageProvider;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const serviceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid service payload', parsed.error.flatten());
      const service = await serviceService.create(parsed.data, req.user?.id);
      return created(res, service);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid service payload', parsed.error.flatten());
      const service = await serviceService.update(req.params.id, parsed.data, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.disable(req.params.id, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.archive(req.params.id, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.restore(req.params.id, req.user?.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await serviceService.getById(req.params.id);
      return ok(res, service);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      // Public callers (no req.user) only ever see active services.
      const onlyActive = !req.user;

      const parsedFilters = serviceListFiltersSchema.safeParse({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        categoryId: typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined,
      });
      if (!parsedFilters.success) throw new ValidationError('Invalid service filters', parsedFilters.error.flatten());

      const { items, total } = await serviceService.list(pagination, onlyActive, parsedFilters.data);
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },

  async getQuestionnaire(req: Request, res: Response, next: NextFunction) {
    try {
      const questionnaire = await serviceService.getQuestionnaire(req.params.id);
      return ok(res, questionnaire);
    } catch (err) {
      next(err);
    }
  },

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can upload service images');
      }

      const file = req.file;
      if (!file) {
        throw new ValidationError('No file provided');
      }

      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new ValidationError(`File type ${file.mimetype} is not allowed. Use JPEG, PNG, WebP, or SVG.`);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError('File exceeds the maximum allowed size of 5MB');
      }

      const stored = await storageProvider.save(file.originalname, file.buffer, file.mimetype);
      const fileUrl = env.cloudinaryCloudName ? stored.fileUrl : `/uploads/${stored.fileUrl}`;
      const service = await serviceService.updateImage(req.params.id, fileUrl, req.user.id);

      return ok(res, { fileUrl, service });
    } catch (err) {
      next(err);
    }
  },

  async removeImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can remove service images');
      }

      const service = await serviceService.updateImage(req.params.id, null, req.user.id);
      return ok(res, { service });
    } catch (err) {
      next(err);
    }
  },
};
