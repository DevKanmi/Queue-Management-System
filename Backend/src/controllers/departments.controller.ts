import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

/**
 * GET /departments/options — public list of department names for dropdowns (e.g. student registration). No auth.
 */
export async function listDepartmentsOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json({ status: 'success', data: { departments } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /departments — list all departments (superadmin only, for platform management)
 */
export async function listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true, created_at: true },
    });
    res.json({ status: 'success', data: { departments } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /departments — create department (superadmin only)
 */
export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name?.trim()) {
      res.status(400).json({ status: 'error', message: 'name is required' });
      return;
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        created_by: userId,
      },
    });
    res.status(201).json({ status: 'success', data: { department } });
  } catch (err) {
    next(err);
  }
}
