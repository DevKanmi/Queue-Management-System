import { Router } from 'express';
import { auth } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validateBody } from '../middleware/validate';
import { createDepartmentBody } from '../validators';
import { listDepartmentsOptions, listDepartments, createDepartment } from '../controllers/departments.controller';

const router = Router();

router.get('/options', listDepartmentsOptions);
router.get('/', auth, roleGuard(['superadmin']), listDepartments);
router.post('/', auth, roleGuard(['superadmin']), validateBody(createDepartmentBody), createDepartment);

export default router;
