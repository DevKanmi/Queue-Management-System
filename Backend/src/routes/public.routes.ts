import { Router } from 'express';
import { getPublicQueue, joinPublicQueue, getGuestStatus, cancelGuestEntry } from '../controllers/public.controller';

const router = Router();

router.get('/q/:joinCode', getPublicQueue);
router.post('/q/:joinCode/join', joinPublicQueue);
router.get('/q/:joinCode/status/:guestToken', getGuestStatus);
router.delete('/q/:joinCode/cancel/:guestToken', cancelGuestEntry);

export default router;
