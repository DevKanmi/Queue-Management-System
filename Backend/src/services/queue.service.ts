import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

export type JoinResult =
  | { type: 'slot'; entry: { id: string; queue_number: number; assigned_time: Date; session_id: string } }
  | { type: 'waitlist'; position: number };

/**
 * Lock session row and get session with capacity. Used inside transaction.
 */
async function lockSessionAndGet(tx: Prisma.TransactionClient, sessionId: string) {
  await tx.$queryRaw`SELECT id, capacity, slot_duration, "total_enrolled", priority_enabled FROM "Session" WHERE id = ${sessionId} FOR UPDATE`;
  const session = await tx.session.findUnique({
    where: { id: sessionId },
    include: { department: { select: { name: true } } },
  });
  return session;
}

/**
 * Compute assigned time for a slot: session date + start_time + (queue_number - 1) * slot_duration minutes.
 */
function assignedTimeForSlot(
  sessionDate: Date,
  startTime: Date,
  slotDurationMinutes: number,
  queueNumber: number
): Date {
  const start = new Date(sessionDate);
  start.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds(), 0);
  const minutes = (queueNumber - 1) * slotDurationMinutes;
  const t = new Date(start.getTime() + minutes * 60 * 1000);
  return t;
}

/**
 * Student joins queue. Uses transaction with FOR UPDATE on session so concurrent joins are safe.
 * If session is full, adds to no_show_waitlist and returns waitlist position.
 * New joiners always go to the end of the queue; priority is set by admin only (stored as routine here).
 */
export async function joinQueue(
  sessionId: string,
  studentId: string,
  _priorityLevel?: 'routine' | 'urgent' | 'emergency'
): Promise<JoinResult> {
  return await prisma.$transaction(async (tx) => {
    const session = await lockSessionAndGet(tx, sessionId);
    if (!session) throw new Error('Session not found');

    const existingEntry = await tx.queueEntry.findFirst({
      where: { session_id: sessionId, student_id: studentId, status: { notIn: ['cancelled', 'no_show'] } },
    });
    if (existingEntry) throw new Error('You are already in this queue or waitlist');

    const existingWaitlist = await tx.noShowWaitlist.findFirst({
      where: { session_id: sessionId, student_id: studentId, status: 'waiting' },
    });
    if (existingWaitlist) throw new Error('You are already on the waitlist');

    const count = session.total_enrolled;
    const capacity = session.capacity;

    if (count >= capacity) {
      const waitlistCount = await tx.noShowWaitlist.count({
        where: { session_id: sessionId, status: 'waiting' },
      });
      await tx.noShowWaitlist.create({
        data: { session_id: sessionId, student_id: studentId, status: 'waiting' },
      });
      return { type: 'waitlist', position: waitlistCount + 1 };
    }

    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    const startTime = session.start_time;
    const slotDuration = session.slot_duration;

    const lastEntry = await tx.queueEntry.findFirst({
      where: { session_id: sessionId, status: { in: ['waiting', 'serving'] } },
      orderBy: { queue_number: 'desc' },
    });
    const queueNumber = lastEntry ? lastEntry.queue_number + 1 : 1;

    const assignedTime = assignedTimeForSlot(sessionDate, startTime, slotDuration, queueNumber);

    const entry = await tx.queueEntry.create({
      data: {
        session_id: sessionId,
        student_id: studentId,
        queue_number: queueNumber,
        assigned_time: assignedTime,
        priority_level: 'routine',
        status: 'waiting',
      },
    });

    await tx.session.update({
      where: { id: sessionId },
      data: { total_enrolled: { increment: 1 } },
    });

    await tx.notification.create({
      data: {
        student_id: studentId,
        entry_id: entry.id,
        message: `You are in the queue for ${session.title}. Queue number: ${queueNumber}. Estimated time: ${assignedTime.toLocaleString()}.`,
        type: 'confirmation',
      },
    });

    return {
      type: 'slot',
      entry: {
        id: entry.id,
        queue_number: entry.queue_number,
        assigned_time: entry.assigned_time,
        session_id: entry.session_id,
      },
    };
  });
}

/**
 * Renumber all waiting/serving entries to 1, 2, 3, ... (no gaps) and update assigned_time.
 * Call after a cancel or no-show so the queue order is preserved and new joiners go to the end.
 */
export async function compactQueue(sessionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      select: { date: true, start_time: true, slot_duration: true, current_serving: true },
    });
    if (!session) return;

    const entries = await tx.queueEntry.findMany({
      where: { session_id: sessionId, status: { in: ['waiting', 'serving'] } },
      orderBy: { queue_number: 'asc' },
      select: { id: true, queue_number: true, status: true },
    });
    if (entries.length === 0) return;

    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    const startTime = session.start_time;
    const slotDuration = session.slot_duration;

    for (let i = 0; i < entries.length; i++) {
      const newNumber = i + 1;
      const assignedTime = assignedTimeForSlot(sessionDate, startTime, slotDuration, newNumber);
      await tx.queueEntry.update({
        where: { id: entries[i].id },
        data: { queue_number: newNumber, assigned_time: assignedTime },
      });
    }

    const servingEntry = entries.find((e) => e.status === 'serving');
    const newCurrentServing = servingEntry ? entries.indexOf(servingEntry) + 1 : 0;
    if (session.current_serving !== newCurrentServing) {
      await tx.session.update({
        where: { id: sessionId },
        data: { current_serving: newCurrentServing },
      });
    }
  });
}

/**
 * Promote first waiting student from no_show_waitlist: assign slot, create queue_entry, update waitlist, create notification.
 * Returns promoted entry and student_id for socket emit, or null if no one to promote.
 */
export async function promoteFromWaitlist(sessionId: string): Promise<{
  entry: { id: string; queue_number: number; assigned_time: Date; student_id: string };
  student_id: string;
} | null> {
  return await prisma.$transaction(async (tx) => {
    const first = await tx.noShowWaitlist.findFirst({
      where: { session_id: sessionId, status: 'waiting' },
      orderBy: { joined_at: 'asc' },
    });
    if (!first) return null;

    const session = await lockSessionAndGet(tx, sessionId);
    if (!session) return null;

    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    const lastEntry = await tx.queueEntry.findFirst({
      where: { session_id: sessionId, status: { in: ['waiting', 'serving'] } },
      orderBy: { queue_number: 'desc' },
    });
    const queueNumber = lastEntry ? lastEntry.queue_number + 1 : 1;
    const assignedTime = assignedTimeForSlot(
      sessionDate,
      session.start_time,
      session.slot_duration,
      queueNumber
    );

    const entry = await tx.queueEntry.create({
      data: {
        session_id: sessionId,
        student_id: first.student_id,
        queue_number: queueNumber,
        assigned_time: assignedTime,
        priority_level: 'routine',
        status: 'waiting',
      },
    });

    await tx.noShowWaitlist.update({
      where: { id: first.id },
      data: { status: 'promoted', promoted_at: new Date() },
    });

    await tx.session.update({
      where: { id: sessionId },
      data: { total_enrolled: { increment: 1 } },
    });

    await tx.notification.create({
      data: {
        student_id: first.student_id,
        entry_id: entry.id,
        message: `You have been promoted from the waitlist for ${session.title}. Your queue number is ${queueNumber}. Estimated time: ${assignedTime.toLocaleString()}.`,
        type: 'promotion',
      },
    });

    return {
      entry: {
        id: entry.id,
        queue_number: entry.queue_number,
        assigned_time: entry.assigned_time,
        student_id: entry.student_id,
      },
      student_id: first.student_id,
    };
  });
}

/**
 * Admin sets priority on a queue entry. When session is priority_enabled and level is urgent/emergency,
 * reorders the queue: emergency = move to front (#1), urgent = move to #2 (or #1 if only one).
 */
export async function setEntryPriority(
  sessionId: string,
  entryId: string,
  priorityLevel: 'routine' | 'urgent' | 'emergency'
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      select: { priority_enabled: true, date: true, start_time: true, slot_duration: true, current_serving: true },
    });
    if (!session) throw new Error('Session not found');
    if (!session.priority_enabled) {
      await tx.queueEntry.update({
        where: { id: entryId, session_id: sessionId },
        data: { priority_level: priorityLevel },
      });
      return;
    }

    const entry = await tx.queueEntry.findFirst({
      where: { id: entryId, session_id: sessionId, status: { in: ['waiting', 'serving'] } },
    });
    if (!entry) throw new Error('Queue entry not found');

    await tx.queueEntry.update({
      where: { id: entryId },
      data: { priority_level: priorityLevel },
    });

    if (priorityLevel === 'routine') return;

    const entries = await tx.queueEntry.findMany({
      where: { session_id: sessionId, status: { in: ['waiting', 'serving'] } },
      orderBy: { queue_number: 'asc' },
      select: { id: true, queue_number: true, status: true },
    });
    if (entries.length <= 1) return;

    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    const startTime = session.start_time;
    const slotDuration = session.slot_duration;

    const targetIndex = entries.findIndex((e) => e.id === entryId);
    if (targetIndex < 0) return;

    const target = entries[targetIndex];
    const others = entries.filter((_, i) => i !== targetIndex);

    const newOrder: typeof entries =
      priorityLevel === 'emergency'
        ? [target, ...others]
        : [others[0], target, ...others.slice(1)];

    for (let i = 0; i < newOrder.length; i++) {
      const newNumber = i + 1;
      const assignedTime = assignedTimeForSlot(sessionDate, startTime, slotDuration, newNumber);
      await tx.queueEntry.update({
        where: { id: newOrder[i].id },
        data: { queue_number: newNumber, assigned_time: assignedTime },
      });
    }

    const servingIndex = newOrder.findIndex((e) => e.status === 'serving');
    const newCurrentServing = servingIndex >= 0 ? servingIndex + 1 : 0;
    await tx.session.update({
      where: { id: sessionId },
      data: { current_serving: newCurrentServing },
    });
  });
}
