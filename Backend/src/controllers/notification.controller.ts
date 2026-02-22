import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

/**
 * GET /notifications — student's notifications (newest first)
 */
export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    if (user.role !== 'student') {
      res.status(403).json({ status: 'error', message: 'Students only' });
      return;
    }
    const notifications = await prisma.notification.findMany({
      where: { student_id: user.id },
      orderBy: { sent_at: 'desc' },
      take: 100,
      select: {
        id: true,
        message: true,
        type: true,
        sent_at: true,
        read_at: true,
        entry_id: true,
      },
    });
    const unreadCount = await prisma.notification.count({
      where: { student_id: user.id, read_at: null },
    });
    res.json({
      status: 'success',
      data: { notifications, unreadCount },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /notifications/:id/read — mark one as read
 */
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const n = await prisma.notification.findFirst({
      where: { id, student_id: user.id },
    });
    if (!n) {
      res.status(404).json({ status: 'error', message: 'Notification not found' });
      return;
    }
    await prisma.notification.update({
      where: { id },
      data: { read_at: new Date() },
    });
    res.json({ status: 'success', data: { read: true } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /notifications/read-all — mark all as read
 */
export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    await prisma.notification.updateMany({
      where: { student_id: user.id, read_at: null },
      data: { read_at: new Date() },
    });
    res.json({ status: 'success', data: { read: true } });
  } catch (err) {
    next(err);
  }
}
