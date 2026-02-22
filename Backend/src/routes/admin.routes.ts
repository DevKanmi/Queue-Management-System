import { Router } from 'express';
import {
  listDepartments,
  listSessions,
  createSession,
  getSessionById,
  updateSessionState,
  deleteSession,
  createAdminUser,
  getSessionQueue,
  callNext,
  markCurrentDone,
  skipStudent,
  setEntryPriorityHandler,
} from '../controllers/admin.controller';
import { auth } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validateBody } from '../middleware/validate';
import { createSessionBody, updateSessionStateBody, createAdminUserBody, setEntryPriorityBody } from '../validators';

const router = Router();

router.get(
  '/departments',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  listDepartments
);
router.post(
  '/users',
  auth,
  roleGuard(['superadmin']),
  validateBody(createAdminUserBody),
  createAdminUser
);
router.get(
  '/sessions',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  listSessions
);
router.post(
  '/sessions',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  validateBody(createSessionBody),
  createSession
);
router.get(
  '/sessions/:id',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  getSessionById
);
router.patch(
  '/sessions/:id/state',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  validateBody(updateSessionStateBody),
  updateSessionState
);
router.delete(
  '/sessions/:id',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  deleteSession
);
router.get(
  '/sessions/:id/queue',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  getSessionQueue
);
router.post(
  '/sessions/:id/queue/next',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  callNext
);
router.post(
  '/sessions/:id/queue/complete',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  markCurrentDone
);
router.post(
  '/sessions/:id/queue/skip',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  skipStudent
);
router.patch(
  '/sessions/:id/queue/entries/:entryId/priority',
  auth,
  roleGuard(['dept_admin', 'lecturer', 'superadmin']),
  validateBody(setEntryPriorityBody),
  setEntryPriorityHandler
);

export default router;
