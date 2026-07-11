import { Router } from 'express';
import { searchController } from './search.controller';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';

const router = Router();

// Admin-only in V1 - no client-facing search per PRD 15.
router.get('/', authenticate, authorize('search.use'), searchController.search);

export default router;
