import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

/**
 * GET /courses/options — public list of courses/programmes for student registration dropdown. No auth.
 */
export async function listCoursesOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json({ status: 'success', data: { courses } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /courses — create a course/programme (superadmin only).
 */
export async function createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      res.status(400).json({ status: 'error', message: 'Course name is required' });
      return;
    }
    const course = await prisma.course.create({
      data: { name: name.trim() },
    });
    res.status(201).json({ status: 'success', data: { course } });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'P2002') {
      res.status(400).json({ status: 'error', message: 'A course with this name already exists' });
      return;
    }
    next(err);
  }
}
