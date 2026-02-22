import { Router } from 'express';
import { register, login, refresh, me } from '../controllers/auth.controller';
import { auth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { registerBody, loginBody, refreshBody } from '../validators';

const router = Router();

router.post('/register', validateBody(registerBody), register);
router.post('/login', validateBody(loginBody), login);
router.post('/refresh', validateBody(refreshBody), refresh);
router.get('/me', auth, me);

export default router;
