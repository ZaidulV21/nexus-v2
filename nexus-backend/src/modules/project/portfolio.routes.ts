import { Router } from 'express';
import { portfolioController } from './portfolio.controller';

const router = Router();

// Public portfolio: completed projects (with their visible completion media)
// ordered newest-first. `?limit=` for "Recent Projects"; `?serviceSlug=` for
// the "Related Service" section on a service's public detail page.
router.get('/', portfolioController.list);
router.get('/summary', portfolioController.summary);

export default router;
