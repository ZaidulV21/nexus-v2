import { Response } from 'express';

export function ok(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function created(res: Response, data: unknown) {
  return ok(res, data, 201);
}

export function paginated(
  res: Response,
  items: unknown[],
  meta: { page: number; pageSize: number; total: number }
) {
  return res.status(200).json({
    success: true,
    data: items,
    meta: {
      page: meta.page,
      pageSize: meta.pageSize,
      total: meta.total,
      totalPages: Math.ceil(meta.total / meta.pageSize),
    },
  });
}
