import { Router } from 'express';
import {
  listSessionsForStudent,
  getSessionByIdForStudent,
  getMyQueueEntries,
} from '../controllers/session.controller';
import { auth } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import queueRoutes from './queue.routes';

const router = Router();

router.get('/', auth, roleGuard(['student']), listSessionsForStudent);
router.get('/my-entries', auth, roleGuard(['student']), getMyQueueEntries);
router.use('/:sessionId/queue', queueRoutes);
router.get('/:id', auth, roleGuard(['student']), getSessionByIdForStudent);

export default router;
