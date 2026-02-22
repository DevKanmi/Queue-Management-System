import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { joinQueue as joinQueueService, promoteFromWaitlist, compactQueue } from '../services/queue.service';
import * as notificationService from '../services/notification.service';
import * as socketService from '../services/socket.service';

/**
 * Ensure session exists, is OPEN or ACTIVE, and student has access (for join).
 */
async function getSessionForStudent(sessionId: string, user: { role: string; department: string | null; faculty: string | null }) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!session) return { session: null, error: 'Session not found' };
  if (session.state !== 'OPEN' && session.state !== 'ACTIVE') {
    return { session: null, error: 'Session is not open for joining' };
  }
  if (session.visibility === 'RESTRICTED') {
    const deptName = session.department?.name;
    if (deptName !== user.department && deptName !== user.faculty) {
      return { session: null, error: 'You do not have access to this session' };
    }
  }
  return { session, error: null };
}

/**
 * POST /sessions/:sessionId/queue/join — student joins queue
 */
export async function joinQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    if (user.role !== 'student') {
      res.status(403).json({ status: 'error', message: 'Students only' });
      return;
    }
    const sessionId = req.params.sessionId as string;
    const { priority_level: priorityLevel } = req.body as { priority_level?: 'routine' | 'urgent' | 'emergency' };
    const { session, error } = await getSessionForStudent(sessionId, user);
    if (error || !session) {
      res.status(error === 'Session not found' ? 404 : 403).json({ status: 'error', message: error });
      return;
    }

    const result = await joinQueueService(sessionId, user.id, priorityLevel || 'routine');

    if (result.type === 'slot') {
      const student = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
      if (student?.email) {
        try {
          await notificationService.sendConfirmationEmail(
            student.email,
            session.title,
            result.entry.queue_number,
            result.entry.assigned_time
          );
        } catch (err) {
          console.error('Queue join: failed to send confirmation email', err);
        }
      }
      const waitingCount = await prisma.queueEntry.count({
        where: { session_id: sessionId, status: 'waiting' },
      });
      socketService.queueUpdate(sessionId, {
        currentServing: session.current_serving ?? 0,
        totalWaiting: waitingCount,
        estimatedWaitMinutes: waitingCount * (session.slot_duration ?? 15),
      });
      res.status(201).json({
        status: 'success',
        data: {
          type: 'slot',
          entry: result.entry,
          message: `You are in the queue. Queue number: ${result.entry.queue_number}.`,
        },
      });
    } else {
      res.status(201).json({
        status: 'success',
        data: {
          type: 'waitlist',
          position: result.position,
          message: `Session is full. You are on the waitlist at position ${result.position}.`,
        },
      });
    }
  } catch (err) {
    const e = err as Error;
    if (e.message === 'Session not found') {
      res.status(404).json({ status: 'error', message: 'Session not found.' });
      return;
    }
    if (e.message?.includes('already in this queue') || e.message?.includes('already on the waitlist')) {
      res.status(400).json({ status: 'error', message: e.message });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: 'We couldn’t add you to the queue. Please try again in a moment.',
    });
    next(err);
  }
}

/**
 * GET /sessions/:sessionId/queue — queue state (position, estimated wait)
 */
export async function getQueueState(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const sessionId = req.params.sessionId as string;
    const { session, error } = await getSessionForStudent(sessionId, user);
    if (error || !session) {
      res.status(error === 'Session not found' ? 404 : 403).json({ status: 'error', message: error });
      return;
    }

    const myEntry = await prisma.queueEntry.findFirst({
      where: { session_id: sessionId, student_id: user.id, status: { notIn: ['cancelled', 'no_show'] } },
    });
    const currentServing = session.current_serving ?? 0;
    const waitingCount = await prisma.queueEntry.count({
      where: { session_id: sessionId, status: 'waiting' },
    });
    const slotDuration = session.slot_duration;

    let position: number | null = null;
    let estimatedWaitMinutes: number | null = null;
    if (myEntry) {
      position = myEntry.queue_number - currentServing;
      if (position > 0) estimatedWaitMinutes = position * slotDuration;
    }

    res.json({
      status: 'success',
      data: {
        currentServing,
        totalWaiting: waitingCount,
        position: position ?? null,
        estimatedWaitMinutes: estimatedWaitMinutes ?? null,
        slotDuration,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /sessions/:sessionId/queue/my-entry — logged-in student's own entry or waitlist
 */
export async function getMyEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const sessionId = req.params.sessionId as string;
    const { session, error } = await getSessionForStudent(sessionId, user);
    if (error || !session) {
      res.status(error === 'Session not found' ? 404 : 403).json({ status: 'error', message: error });
      return;
    }

    const entry = await prisma.queueEntry.findFirst({
      where: { session_id: sessionId, student_id: user.id, status: { notIn: ['cancelled', 'no_show'] } },
    });
    const waitlist = await prisma.noShowWaitlist.findFirst({
      where: { session_id: sessionId, student_id: user.id, status: 'waiting' },
    });
    if (entry) {
      const positionAhead = await prisma.queueEntry.count({
        where: {
          session_id: sessionId,
          status: 'waiting',
          queue_number: { lt: entry.queue_number },
        },
      });
      res.json({
        status: 'success',
        data: {
          type: 'slot',
          entry: {
            id: entry.id,
            queue_number: entry.queue_number,
            assigned_time: entry.assigned_time,
            status: entry.status,
            positionAhead,
          },
        },
      });
      return;
    }
    if (waitlist) {
      const position = await prisma.noShowWaitlist.count({
        where: { session_id: sessionId, status: 'waiting', joined_at: { lte: waitlist.joined_at } },
      });
      res.json({
        status: 'success',
        data: { type: 'waitlist', position, joined_at: waitlist.joined_at },
      });
      return;
    }
    res.json({ status: 'success', data: { type: null, entry: null } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /sessions/:sessionId/queue/cancel — student cancels; promote from waitlist if any
 */
export async function cancelEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const sessionId = req.params.sessionId as string;
    const { session, error } = await getSessionForStudent(sessionId, user);
    if (error || !session) {
      res.status(error === 'Session not found' ? 404 : 403).json({ status: 'error', message: error });
      return;
    }

    const entry = await prisma.queueEntry.findFirst({
      where: { session_id: sessionId, student_id: user.id, status: { in: ['waiting', 'serving'] } },
    });
    const waitlistEntry = await prisma.noShowWaitlist.findFirst({
      where: { session_id: sessionId, student_id: user.id, status: 'waiting' },
    });

    if (waitlistEntry) {
      await prisma.noShowWaitlist.update({
        where: { id: waitlistEntry.id },
        data: { status: 'expired' },
      });
      res.json({ status: 'success', data: { message: 'Removed from waitlist' } });
      return;
    }

    if (!entry) {
      res.status(404).json({ status: 'error', message: 'No queue or waitlist entry to cancel' });
      return;
    }

    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { status: 'cancelled' },
    });
    await prisma.session.update({
      where: { id: sessionId },
      data: { total_enrolled: { decrement: 1 } },
    });

    await compactQueue(sessionId);

    const promoted = await promoteFromWaitlist(sessionId);
    if (promoted) {
      const student = await prisma.user.findUnique({ where: { id: promoted.student_id }, select: { email: true } });
      if (student?.email) {
        notificationService.sendPromotionEmail(
          student.email,
          session.title,
          promoted.entry.queue_number,
          promoted.entry.assigned_time
        );
      }
      socketService.slotAssigned(promoted.student_id, {
        queueNumber: promoted.entry.queue_number,
        assignedTime: promoted.entry.assigned_time.toISOString(),
      });
    }

    const updatedSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { current_serving: true, slot_duration: true },
    });
    const waitingCount = await prisma.queueEntry.count({
      where: { session_id: sessionId, status: 'waiting' },
    });
    socketService.queueUpdate(sessionId, {
      currentServing: updatedSession?.current_serving ?? 0,
      totalWaiting: waitingCount,
      estimatedWaitMinutes: waitingCount * (updatedSession?.slot_duration ?? 15),
    });

    res.json({ status: 'success', data: { message: 'Entry cancelled' } });
  } catch (err) {
    next(err);
  }
}
