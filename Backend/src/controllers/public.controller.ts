import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { joinQueue as joinQueueService } from '../services/queue.service';
import * as socketService from '../services/socket.service';

/**
 * GET /public/q/:joinCode — Public session info (no auth)
 */
export async function getPublicQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { joinCode } = req.params as { joinCode: string };
    const session = await prisma.session.findUnique({
      where: { join_code: joinCode.toUpperCase() },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Queue not found' });
      return;
    }
    const waitingCount = await prisma.queueEntry.count({ where: { session_id: session.id, status: 'waiting' } });
    res.json({
      status: 'success',
      data: {
        session: {
          id: session.id,
          title: session.title,
          state: session.state,
          capacity: session.capacity,
          slot_duration: session.slot_duration,
          current_serving: session.current_serving,
          total_enrolled: session.total_enrolled,
          date: session.date,
          start_time: session.start_time,
          join_code: session.join_code,
          organization: session.organization,
          waiting_count: waitingCount,
          estimated_wait_minutes: waitingCount * session.slot_duration,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /public/q/:joinCode/join — Anonymous join
 */
export async function joinPublicQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { joinCode } = req.params as { joinCode: string };
    const { name, phone, email } = req.body as { name?: string; phone?: string; email?: string };

    if (!name?.trim()) {
      res.status(400).json({ status: 'error', message: 'Name is required' });
      return;
    }
    if (!phone?.trim()) {
      res.status(400).json({ status: 'error', message: 'Phone number is required' });
      return;
    }

    const session = await prisma.session.findUnique({ where: { join_code: joinCode.toUpperCase() } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Queue not found' });
      return;
    }
    if (session.state !== 'OPEN' && session.state !== 'ACTIVE') {
      res.status(400).json({ status: 'error', message: 'This queue is not currently accepting new entries' });
      return;
    }

    const guest_token = randomUUID();

    const result = await joinQueueService(session.id, null, 'routine', {
      guest_name: name.trim(),
      guest_phone: phone.trim(),
      guest_email: email?.trim() || undefined,
      guest_token,
    });

    if (result.type === 'slot') {
      const waitingCount = await prisma.queueEntry.count({ where: { session_id: session.id, status: 'waiting' } });
      socketService.queueUpdate(session.id, {
        currentServing: session.current_serving ?? 0,
        totalWaiting: waitingCount,
        estimatedWaitMinutes: waitingCount * session.slot_duration,
      });
      res.status(201).json({
        status: 'success',
        data: {
          type: 'slot',
          queue_number: result.entry.queue_number,
          position: result.entry.queue_number,
          assigned_time: result.entry.assigned_time,
          estimated_wait: (result.entry.queue_number - 1) * session.slot_duration,
          guest_token,
          session_id: session.id,
        },
      });
    } else {
      res.status(201).json({
        status: 'success',
        data: {
          type: 'waitlist',
          position: result.position,
          message: `Session is full. You are on the waitlist at position ${result.position}.`,
          guest_token,
          session_id: session.id,
        },
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /public/q/:joinCode/status/:guestToken — Guest queue status
 */
export async function getGuestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { joinCode, guestToken } = req.params as { joinCode: string; guestToken: string };
    const session = await prisma.session.findUnique({ where: { join_code: joinCode.toUpperCase() } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Queue not found' });
      return;
    }

    const entry = await prisma.queueEntry.findUnique({ where: { guest_token: guestToken } });
    if (!entry || entry.session_id !== session.id) {
      res.status(404).json({ status: 'error', message: 'Entry not found' });
      return;
    }

    const currentServing = session.current_serving ?? 0;
    const positionAhead = await prisma.queueEntry.count({
      where: { session_id: session.id, status: 'waiting', queue_number: { lt: entry.queue_number } },
    });
    const estimatedWaitMinutes = positionAhead * session.slot_duration;

    res.json({
      status: 'success',
      data: {
        queue_number: entry.queue_number,
        status: entry.status,
        position_ahead: positionAhead,
        current_serving: currentServing,
        estimated_wait_minutes: estimatedWaitMinutes,
        assigned_time: entry.assigned_time,
        session_title: session.title,
        session_state: session.state,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /public/q/:joinCode/cancel/:guestToken — Guest cancels their spot
 */
export async function cancelGuestEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { joinCode, guestToken } = req.params as { joinCode: string; guestToken: string };
    const session = await prisma.session.findUnique({ where: { join_code: joinCode.toUpperCase() } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Queue not found' });
      return;
    }

    const entry = await prisma.queueEntry.findUnique({ where: { guest_token: guestToken } });
    if (!entry || entry.session_id !== session.id) {
      res.status(404).json({ status: 'error', message: 'Entry not found' });
      return;
    }
    if (entry.status === 'cancelled' || entry.status === 'completed' || entry.status === 'no_show') {
      res.status(400).json({ status: 'error', message: 'Entry cannot be cancelled' });
      return;
    }

    await prisma.queueEntry.update({ where: { id: entry.id }, data: { status: 'cancelled' } });
    await prisma.session.update({ where: { id: session.id }, data: { total_enrolled: { decrement: 1 } } });

    const { compactQueue, promoteFromWaitlist } = await import('../services/queue.service');
    await compactQueue(session.id);
    await promoteFromWaitlist(session.id);

    const updatedSession = await prisma.session.findUnique({ where: { id: session.id }, select: { current_serving: true, slot_duration: true } });
    const waitingCount = await prisma.queueEntry.count({ where: { session_id: session.id, status: 'waiting' } });
    socketService.queueUpdate(session.id, {
      currentServing: updatedSession?.current_serving ?? 0,
      totalWaiting: waitingCount,
      estimatedWaitMinutes: waitingCount * (updatedSession?.slot_duration ?? 15),
    });

    res.json({ status: 'success', data: { message: 'Entry cancelled' } });
  } catch (err) {
    next(err);
  }
}
