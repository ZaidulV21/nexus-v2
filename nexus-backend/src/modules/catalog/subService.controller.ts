import { Request, Response, NextFunction } from 'express';
import {
  subServiceService,
  SUB_SERVICE_IMAGE_FIELDS,
  SubServiceImageField,
} from './subService.service';
import {
  createSubServiceSchema,
  updateSubServiceSchema,
  subServiceListFiltersSchema,
  subServiceReorderSchema,
} from './subService.validation';
import { ok, created, paginated } from '../../core/utils/response';
import { parsePagination } from '../../core/utils/pagination';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';
import { localStorageProvider } from '../../core/storage/localStorage.provider';
import { cloudinaryProvider } from '../../core/storage/cloudinary.provider';
import { env } from '../../config/env';

const storageProvider = env.cloudinaryCloudName ? cloudinaryProvider : localStorageProvider;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function parseImageField(query: unknown): SubServiceImageField {
  if (typeof query !== 'string' || query === '') return 'heroImage';
  if (!(SUB_SERVICE_IMAGE_FIELDS as readonly string[]).includes(query)) {
    throw new ValidationError(
      `Invalid image field "${query}". Expected one of: ${SUB_SERVICE_IMAGE_FIELDS.join(', ')}`,
    );
  }
  return query as SubServiceImageField;
}

export const subServiceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createSubServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid sub-service payload', parsed.error.flatten());
      const subService = await subServiceService.create(req.params.id, parsed.data, req.user?.id);
      return created(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateSubServiceSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid sub-service payload', parsed.error.flatten());
      const subService = await subServiceService.update(req.params.subId, parsed.data, req.user?.id);
      return ok(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async disable(req: Request, res: Response, next: NextFunction) {
    try {
      const subService = await subServiceService.disable(req.params.subId, req.user?.id);
      return ok(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const subService = await subServiceService.archive(req.params.subId, req.user?.id);
      return ok(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const subService = await subServiceService.restore(req.params.subId, req.user?.id);
      return ok(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const subService = await subServiceService.softDelete(req.params.subId, req.user?.id);
      return ok(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async undelete(req: Request, res: Response, next: NextFunction) {
    try {
      const subService = await subServiceService.undelete(req.params.subId, req.user?.id);
      return ok(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const subService = await subServiceService.duplicate(req.params.subId, req.user?.id);
      return created(res, subService);
    } catch (err) {
      next(err);
    }
  },

  async listByService(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      // Public callers (no req.user) only ever see active sub-services.
      const onlyActive = !req.user;

      const parsedFilters = subServiceListFiltersSchema.safeParse({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      if (!parsedFilters.success) throw new ValidationError('Invalid sub-service filters', parsedFilters.error.flatten());

      const { items, total } = await subServiceService.listByService(
        req.params.id,
        pagination,
        onlyActive,
        parsedFilters.data,
      );
      return paginated(res, items, { page: pagination.page, pageSize: pagination.pageSize, total });
    } catch (err) {
      next(err);
    }
  },

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = subServiceReorderSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid reorder payload', parsed.error.flatten());
      const result = await subServiceService.reorder(req.params.id, parsed.data.orderedIds, req.user?.id);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can upload sub-service images');
      }

      const file = req.file;
      if (!file) throw new ValidationError('No file provided');

      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new ValidationError(`File type ${file.mimetype} is not allowed. Use JPEG, PNG, WebP, or SVG.`);
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new ValidationError('File exceeds the maximum allowed size of 5MB');
      }

      const stored = await storageProvider.save(file.originalname, file.buffer, file.mimetype);
      const fileUrl = env.cloudinaryCloudName ? stored.fileUrl : `/uploads/${stored.fileUrl}`;
      const field = parseImageField(req.query.field);
      const subService = await subServiceService.updateImage(req.params.subId, fileUrl, field, req.user.id);

      return ok(res, { fileUrl, subService });
    } catch (err) {
      next(err);
    }
  },

  async removeImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can remove sub-service images');
      }

      const field = parseImageField(req.query.field);
      const subService =
        field === 'gallery'
          ? await subServiceService.removeGalleryImage(req.params.subId, String(req.query.url ?? ''), req.user.id)
          : await subServiceService.updateImage(req.params.subId, null, field, req.user.id);
      return ok(res, { subService });
    } catch (err) {
      next(err);
    }
  },
};
