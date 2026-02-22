import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

/**
 * GET /sessions — student: list OPEN sessions + RESTRICTED where student's dept/faculty matches
 */
export async function listSessionsForStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    if (user.role !== 'student') {
      res.status(403).json({ status: 'error', message: 'Students only' });
      return;
    }

    const sessions = await prisma.session.findMany({
      where: {
        state: { in: ['OPEN', 'ACTIVE'] },
        OR: [
          { visibility: 'OPEN' },
          {
            visibility: 'RESTRICTED',
            department: {
              name: {
                in: [user.department, user.faculty].filter(Boolean) as string[],
              },
            },
          },
        ],
      },
      include: {
        department: { select: { id: true, name: true } },
        creator: { select: { full_name: true } },
      },
      orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
    });
    res.json({ status: 'success', data: { sessions } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /sessions/my-entries — student: queue entries (current + history) and waitlist memberships with session info
 */
export async function getMyQueueEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    if (user.role !== 'student') {
      res.status(403).json({ status: 'error', message: 'Students only' });
      return;
    }

    const entries = await prisma.queueEntry.findMany({
      where: { student_id: user.id },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            state: true,
            date: true,
            start_time: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { joined_at: 'desc' },
    });

    const waitlistRows = await prisma.noShowWaitlist.findMany({
      where: { student_id: user.id, status: 'waiting' },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            state: true,
            date: true,
            start_time: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { joined_at: 'asc' },
    });

    const waitlists: { sessionId: string; session: typeof waitlistRows[0]['session']; position: number }[] = [];
    for (const row of waitlistRows) {
      const position = await prisma.noShowWaitlist.count({
        where: { session_id: row.session_id, status: 'waiting', joined_at: { lte: row.joined_at } },
      });
      waitlists.push({ sessionId: row.session_id, session: row.session, position });
    }

    res.json({ status: 'success', data: { entries, waitlists } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /sessions/:id — student: session details if they have access
 */
export async function getSessionByIdForStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    if (user.role !== 'student') {
      res.status(403).json({ status: 'error', message: 'Students only' });
      return;
    }
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        creator: { select: { full_name: true } },
      },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (session.state !== 'OPEN' && session.state !== 'ACTIVE') {
      res.status(404).json({ status: 'error', message: 'Session not found or not open' });
      return;
    }
    if (session.visibility === 'RESTRICTED') {
      const deptName = session.department?.name;
      if (deptName !== user.department && deptName !== user.faculty) {
        res.status(403).json({ status: 'error', message: 'You do not have access to this session' });
        return;
      }
    }
    res.json({ status: 'success', data: { session } });
  } catch (err) {
    next(err);
  }
}
