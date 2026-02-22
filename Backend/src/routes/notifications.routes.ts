import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { listNotifications, markRead, markAllRead } from '../controllers/notification.controller';

const router = Router();

router.get('/', auth, roleGuard(['student']), listNotifications);
router.patch('/read-all', auth, roleGuard(['student']), markAllRead);
router.patch('/:id/read', auth, roleGuard(['student']), markRead);

export default router;
