import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import {
  createOrg,
  listMyOrgs,
  getOrg,
  createOrgSession,
  listOrgSessions,
  getOrgSession,
  updateOrgSessionState,
  getOrgQueue,
  callNext,
  markDone,
  skipEntry,
} from '../controllers/orgs.controller';

const router = Router();

// All organizer routes require auth + organizer role
router.use(auth, roleGuard(['organizer']));

router.post('/', createOrg);
router.get('/', listMyOrgs);
router.get('/:slug', getOrg);
router.post('/:slug/sessions', createOrgSession);
router.get('/:slug/sessions', listOrgSessions);
router.get('/:slug/sessions/:id', getOrgSession);
router.patch('/:slug/sessions/:id/state', updateOrgSessionState);
router.get('/:slug/sessions/:id/queue', getOrgQueue);
router.post('/:slug/sessions/:id/queue/next', callNext);
router.post('/:slug/sessions/:id/queue/complete', markDone);
router.post('/:slug/sessions/:id/queue/skip', skipEntry);

export default router;
