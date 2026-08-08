import { Request, Response } from 'express';
import { buildSitemapUrls, renderRobotsTxt, renderSitemapXml } from './seo.service';

export const seoController = {
  async sitemap(_req: Request, res: Response) {
    try {
      const urls = await buildSitemapUrls();
      res
        .status(200)
        .set('Content-Type', 'application/xml')
        .set('Cache-Control', 'public, max-age=3600')
        .send(renderSitemapXml(urls));
    } catch (err) {
      // A sitemap must never take the site down: degrade to a 500 JSON error
      // handled by the global error handler.
      throw err;
    }
  },

  robots(_req: Request, res: Response) {
    res
      .status(200)
      .set('Content-Type', 'text/plain; charset=utf-8')
      .set('Cache-Control', 'public, max-age=3600')
      .send(renderRobotsTxt());
  },
};
