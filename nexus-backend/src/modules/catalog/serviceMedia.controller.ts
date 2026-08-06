import { Request, Response, NextFunction } from 'express';
import { serviceMediaService } from './serviceMedia.service';
import {
  createServiceMediaSchema,
  updateServiceMediaSchema,
  serviceMediaReorderSchema,
} from './serviceMedia.validation';
import { ok, created } from '../../core/utils/response';
import { ValidationError, UnauthorizedError } from '../../core/errors/AppError';
import { localStorageProvider } from '../../core/storage/localStorage.provider';
import { cloudinaryProvider } from '../../core/storage/cloudinary.provider';
import { env } from '../../config/env';

const storageProvider = env.cloudinaryCloudName ? cloudinaryProvider : localStorageProvider;

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'application/mp4',
  'video/x-m4v',
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function inferType(mimetype: string): 'IMAGE' | 'VIDEO' {
  if (IMAGE_MIME_TYPES.has(mimetype)) return 'IMAGE';
  if (VIDEO_MIME_TYPES.has(mimetype)) return 'VIDEO';
  throw new ValidationError(
    `File type ${mimetype} is not allowed. Use JPEG, PNG, WebP or SVG images, or MP4/WebM/OGG videos.`,
  );
}

function toFileUrl(stored: { fileUrl: string }) {
  return env.cloudinaryCloudName ? stored.fileUrl : `/uploads/${stored.fileUrl}`;
}

export const serviceMediaController = {
  // Public callers (no req.user) only ever see active items.
  async listByService(req: Request, res: Response, next: NextFunction) {
    try {
      const onlyActive = !req.user;
      const items = await serviceMediaService.listByService(req.params.id, onlyActive);
      return ok(res, items);
    } catch (err) {
      next(err);
    }
  },

  // Uploads an image or video file and creates a gallery item. The media type
  // is inferred from the file's mimetype (never trusted from the client).
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can upload gallery items');
      }

      const file = req.file;
      if (!file) throw new ValidationError('No file provided');

      const type = inferType(file.mimetype);
      const maxSize = type === 'VIDEO' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        throw new ValidationError(
          `File exceeds the maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
        );
      }

      const stored = await storageProvider.save(file.originalname, file.buffer, file.mimetype);
      const media = await serviceMediaService.create(
        req.params.id,
        { type, url: toFileUrl(stored) },
        req.user.id,
      );

      return created(res, { fileUrl: toFileUrl(stored), media });
    } catch (err) {
      next(err);
    }
  },

  // Uploads a poster/cover image for an existing item (used as the video
  // thumbnail so the public gallery does not flash black).
  async uploadPoster(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.type !== 'ADMIN') {
        throw new UnauthorizedError('Only admins can upload gallery posters');
      }

      const file = req.file;
      if (!file) throw new ValidationError('No file provided');
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        throw new ValidationError('Posters must be JPEG, PNG, WebP or SVG images.');
      }
      if (file.size > MAX_IMAGE_SIZE) {
        throw new ValidationError('File exceeds the maximum allowed size of 5MB');
      }

      const stored = await storageProvider.save(file.originalname, file.buffer, file.mimetype);
      const media = await serviceMediaService.update(
        req.params.mediaId,
        { posterUrl: toFileUrl(stored) },
        req.user.id,
      );

      return ok(res, { fileUrl: toFileUrl(stored), media });
    } catch (err) {
      next(err);
    }
  },

  // Adds a gallery item from an existing URL (e.g. a hosted video) instead of
  // a file upload.
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createServiceMediaSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid gallery payload', parsed.error.flatten());
      const media = await serviceMediaService.create(req.params.id, parsed.data, req.user?.id);
      return created(res, media);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateServiceMediaSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid gallery payload', parsed.error.flatten());
      const media = await serviceMediaService.update(req.params.mediaId, parsed.data, req.user?.id);
      return ok(res, media);
    } catch (err) {
      next(err);
    }
  },

  async setFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await serviceMediaService.setFeatured(req.params.id, req.params.mediaId, req.user?.id);
      return ok(res, media);
    } catch (err) {
      next(err);
    }
  },

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await serviceMediaService.toggleActive(req.params.mediaId, req.user?.id);
      return ok(res, media);
    } catch (err) {
      next(err);
    }
  },

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = serviceMediaReorderSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid reorder payload', parsed.error.flatten());
      const result = await serviceMediaService.reorder(req.params.id, parsed.data.orderedIds, req.user?.id);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await serviceMediaService.remove(req.params.mediaId, req.user?.id);
      return ok(res, result);
    } catch (err) {
      next(err);
    }
  },
};
