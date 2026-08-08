import { Router } from 'express';
import { seoController } from './seo.controller';

const router = Router();

// Machine-readable SEO endpoints. Mounted at the app root (not under /api) so
// the public origin can expose them at /sitemap.xml and /robots.txt directly,
// or via a reverse-proxy that forwards those two paths to the backend.
router.get('/sitemap.xml', seoController.sitemap);
router.get('/robots.txt', seoController.robots);

export default router;
