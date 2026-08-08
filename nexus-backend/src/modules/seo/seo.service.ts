import { prisma } from '../../config/database';
import { env } from '../../config/env';

// Sitemap base URL. In production APP_URL should point at the public website
// origin (e.g. https://example.com). Defaults to the local frontend dev URL.
const baseUrl = () => env.appUrl.replace(/\/+$/, '');

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function isoDate(date: Date): string {
  return date.toISOString();
}

// Static marketing pages every Nexus public website ships with. Home is the
// highest priority; the rest are top-level navigation entries.
const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/services', changefreq: 'weekly', priority: '0.9' },
  { path: '/industries', changefreq: 'monthly', priority: '0.6' },
  { path: '/how-it-works', changefreq: 'monthly', priority: '0.6' },
  { path: '/projects', changefreq: 'weekly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/get-quote', changefreq: 'monthly', priority: '0.7' },
];

/**
 * Build the URL set for sitemap.xml by querying the live catalog, so the
 * sitemap always mirrors what the public website exposes:
 *   static pages + every active service + every active sub-service.
 * Archived/soft-deleted/inactive rows are excluded automatically.
 */
export async function buildSitemapUrls(): Promise<SitemapUrl[]> {
  const [services, subServices] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true, archivedAt: null, deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { name: 'asc' },
    }),
    prisma.subService.findMany({
      where: { isActive: true, archivedAt: null, deletedAt: null },
      select: { slug: true, updatedAt: true, service: { select: { slug: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const urls: SitemapUrl[] = STATIC_PAGES.map((p) => ({
    loc: `${baseUrl()}${p.path === '/' ? '/' : p.path}`,
    lastmod: isoDate(new Date()),
    changefreq: p.changefreq,
    priority: p.priority,
  }));

  for (const service of services) {
    urls.push({
      loc: `${baseUrl()}/services/${service.slug}`,
      lastmod: isoDate(service.updatedAt),
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  for (const sub of subServices) {
    urls.push({
      loc: `${baseUrl()}/services/${sub.service.slug}/${sub.slug}`,
      lastmod: isoDate(sub.updatedAt),
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  return urls;
}

export function renderSitemapXml(urls: SitemapUrl[]): string {
  const body = urls
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${escapeXml(u.loc)}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`,
    )
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  );
}

export function renderRobotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /portal',
    'Disallow: /login',
    `Sitemap: ${baseUrl()}/sitemap.xml`,
    '',
  ].join('\n');
}
