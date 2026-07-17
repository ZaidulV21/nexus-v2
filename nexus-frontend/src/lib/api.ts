// Thin fetch wrapper: attaches the auth token, unwraps the backend's
// { success, data } / { success, error } envelope, and normalizes failures
// into a single ApiError. Every service module calls this instead of
// calling fetch() directly.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called once by AuthContext so this module can attach/clear the token
 *  without every service file needing to know where the token lives. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called once by AuthContext so a 401 anywhere can trigger a clean logout. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(BASE_URL.replace(/\/$/, '') + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function fetchEnvelope(path: string, options: RequestOptions = {}): Promise<{ data: any; meta?: any }> {
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no JSON body */
  }

  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    const message = json?.error?.message || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, json?.error?.details);
  }

  return json ?? {};
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const json = await fetchEnvelope(path, options);
  return (json.data ?? json) as T;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** For endpoints built with the backend's `paginated()` response helper -
 *  { success, data: T[], meta }. api.get() alone would silently discard
 *  `meta`, which every list page needs for its Pagination component. */
export async function apiRequestPaginated<T>(
  path: string,
  query?: RequestOptions['query']
): Promise<{ items: T[]; meta: PaginationMeta }> {
  const json = await fetchEnvelope(path, { method: 'GET', query });
  return { items: (json.data ?? []) as T[], meta: json.meta as PaginationMeta };
}

/** Multipart upload (file + metadata fields). Deliberately does NOT set
 *  Content-Type - the browser adds the correct multipart boundary itself. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: formData,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no JSON body */
  }

  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    const message = json?.error?.message || `Upload failed with status ${res.status}`;
    throw new ApiError(message, res.status, json?.error?.details);
  }

  return (json?.data ?? json) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => apiRequest<T>(path, { method: 'GET', query }),
  getPaginated: <T>(path: string, query?: RequestOptions['query']) => apiRequestPaginated<T>(path, query),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
};
