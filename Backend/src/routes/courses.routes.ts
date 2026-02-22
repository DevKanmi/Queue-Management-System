import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validateBody } from '../middleware/validate';
import { createCourseBody } from '../validators';
import { listCoursesOptions, createCourse } from '../controllers/courses.controller';

const router = Router();

router.get('/options', listCoursesOptions);
router.post('/', auth, roleGuard(['superadmin']), validateBody(createCourseBody), createCourse);

export default router;
