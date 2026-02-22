import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validateBody } from '../middleware/validate';
import { joinQueueBody } from '../validators';
import { joinQueue, getQueueState, getMyEntry, cancelEntry } from '../controllers/queue.controller';

const router = Router({ mergeParams: true });

router.post('/join', auth, roleGuard(['student']), validateBody(joinQueueBody), joinQueue);
router.get('/', auth, roleGuard(['student']), getQueueState);
router.get('/my-entry', auth, roleGuard(['student']), getMyEntry);
router.delete('/cancel', auth, roleGuard(['student']), cancelEntry);

export default router;
