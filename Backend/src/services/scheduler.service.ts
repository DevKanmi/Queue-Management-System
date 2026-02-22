import cron from 'node-cron';
import { prisma } from '../config/db';
import * as notificationService from './notification.service';
import { compactQueue, promoteFromWaitlist } from './queue.service';
import * as socketService from './socket.service';

const GRACE_MINUTES = Number(process.env.GRACE_PERIOD_MINUTES) || 10;
const REMINDER_MINUTES = Number(process.env.REMINDER_MINUTES_BEFORE) || 30;

/**
 * Job 1 — Reminder: queue entries whose assigned_time is within REMINDER_MINUTES, reminder_sent = false, status = waiting
 */
async function runReminderJob() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_MINUTES * 60 * 1000);
  try {
    const entries = await prisma.queueEntry.findMany({
      where: {
        status: 'waiting',
        reminder_sent: false,
        assigned_time: { gte: now, lte: windowEnd },
      },
      include: {
        session: { select: { title: true } },
        student: { select: { email: true } },
      },
    });
    for (const entry of entries) {
      if (entry.student?.email) {
        await notificationService.sendReminderEmail(
          entry.student.email,
          entry.session.title,
          entry.queue_number,
          entry.assigned_time
        );
      }
      await prisma.queueEntry.update({
        where: { id: entry.id },
        data: { reminder_sent: true },
      });
      await prisma.notification.create({
        data: {
          student_id: entry.student_id,
          entry_id: entry.id,
          message: `Reminder: Your slot for ${entry.session.title} is around ${entry.assigned_time.toLocaleString()}. Queue #${entry.queue_number}.`,
          type: 'reminder',
        },
      });
    }
    if (entries.length > 0) {
      console.log(`[Scheduler] Sent ${entries.length} reminder(s).`);
    }
  } catch (err) {
    console.error('[Scheduler] Reminder job error:', err);
  }
}

/**
 * Job 2 — No-show: entries where assigned_time + grace has passed, status still waiting → mark NO_SHOW, promote waitlist
 */
async function runNoShowJob() {
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000);
  try {
    const entries = await prisma.queueEntry.findMany({
      where: {
        status: 'waiting',
        assigned_time: { lt: cutoff },
      },
      include: { session: { select: { id: true, title: true, department_id: true } } },
    });
    for (const entry of entries) {
      await prisma.queueEntry.update({
        where: { id: entry.id },
        data: { status: 'no_show' },
      });
      await prisma.session.update({
        where: { id: entry.session_id },
        data: { total_enrolled: { decrement: 1 } },
      });
      await compactQueue(entry.session_id);
      socketService.studentNoShow(entry.session.department_id, {
        sessionId: entry.session_id,
        queueNumber: entry.queue_number,
        studentId: entry.student_id,
      });
      const promoted = await promoteFromWaitlist(entry.session_id);
      if (promoted) {
        const student = await prisma.user.findUnique({
          where: { id: promoted.student_id },
          select: { email: true },
        });
        if (student?.email) {
          await notificationService.sendPromotionEmail(
            student.email,
            entry.session.title,
            promoted.entry.queue_number,
            promoted.entry.assigned_time
          );
        }
        socketService.slotAssigned(promoted.student_id, {
          queueNumber: promoted.entry.queue_number,
          assignedTime: promoted.entry.assigned_time.toISOString(),
        });
        await prisma.notification.create({
          data: {
            student_id: promoted.student_id,
            entry_id: promoted.entry.id,
            message: `You were promoted from the waitlist for ${entry.session.title}. Queue #${promoted.entry.queue_number}.`,
            type: 'promotion',
          },
        });
      }
      const updatedSession = await prisma.session.findUnique({
        where: { id: entry.session_id },
        select: { current_serving: true, slot_duration: true },
      });
      const waitingCount = await prisma.queueEntry.count({
        where: { session_id: entry.session_id, status: 'waiting' },
      });
      socketService.queueUpdate(entry.session_id, {
        currentServing: updatedSession?.current_serving ?? 0,
        totalWaiting: waitingCount,
        estimatedWaitMinutes: waitingCount * (updatedSession?.slot_duration ?? 15),
      });
    }
    if (entries.length > 0) {
      console.log(`[Scheduler] Processed ${entries.length} no-show(s).`);
    }
  } catch (err) {
    console.error('[Scheduler] No-show job error:', err);
  }
}

/**
 * Job 3 — Daily auto-close: OPEN or ACTIVE sessions → CLOSED, log
 */
async function runDailyCloseJob() {
  try {
    const sessions = await prisma.session.findMany({
      where: { state: { in: ['OPEN', 'ACTIVE'] } },
    });
    for (const session of sessions) {
      await prisma.$transaction([
        prisma.session.update({
          where: { id: session.id },
          data: { state: 'CLOSED' },
        }),
        prisma.sessionLog.create({
          data: {
            session_id: session.id,
            admin_id: session.created_by,
            action: 'state_changed',
            metadata: { from: session.state, to: 'CLOSED', reason: 'daily_auto_close' },
          },
        }),
      ]);
    }
    if (sessions.length > 0) {
      console.log(`[Scheduler] Auto-closed ${sessions.length} session(s).`);
    }
  } catch (err) {
    console.error('[Scheduler] Daily close job error:', err);
  }
}

export function startScheduler() {
  cron.schedule('*/5 * * * *', runReminderJob);
  cron.schedule('*/5 * * * *', runNoShowJob);
  cron.schedule('59 23 * * *', runDailyCloseJob);
  console.log('[Scheduler] Started: reminder & no-show every 5 min, daily close at 23:59');
}
