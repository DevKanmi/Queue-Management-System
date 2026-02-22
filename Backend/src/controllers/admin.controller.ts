import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/db';
import { compactQueue, promoteFromWaitlist, setEntryPriority } from '../services/queue.service';
import * as notificationService from '../services/notification.service';
import * as socketService from '../services/socket.service';

const SALT_ROUNDS = 12;

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['OPEN'],
  OPEN: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['PAUSED', 'CLOSED'],
  PAUSED: ['ACTIVE'],
  CLOSED: [],
};

function canAccessSession(user: { id: string; role: string; department_id: string | null }, session: { created_by: string; department_id: string }) {
  if (user.role === 'superadmin') return true;
  if (user.role === 'lecturer' && session.created_by === user.id) return true;
  if (user.role === 'dept_admin' && session.department_id === user.department_id) return true;
  return false;
}

/**
 * GET /admin/departments — list departments (all for superadmin/dept_admin; lecturers see only their department)
 */
export async function listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    if (user.role === 'lecturer') {
      if (!user.department_id) {
        res.status(403).json({ status: 'error', message: 'Lecturer has no department assigned. Contact superadmin.' });
        return;
      }
      const departments = await prisma.department.findMany({
        where: { id: user.department_id },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true },
      });
      res.json({ status: 'success', data: { departments } });
      return;
    }
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
    res.json({ status: 'success', data: { departments } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/sessions — list sessions created by the logged-in admin/lecturer
 */
export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessions = await prisma.session.findMany({
      where: { created_by: userId },
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    });
    res.json({ status: 'success', data: { sessions } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/sessions — create session (dept_admin + lecturer only)
 */
export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { title, department_id, date, start_time, capacity, slot_duration, visibility, priority_enabled } = req.body as {
      title?: string;
      department_id?: string;
      date?: string;
      start_time?: string;
      capacity?: number;
      slot_duration?: number;
      visibility?: string;
      priority_enabled?: boolean;
    };

    if (!title?.trim() || !department_id || !date || !start_time || capacity == null || slot_duration == null) {
      res.status(400).json({ status: 'error', message: 'title, department_id, date, start_time, capacity, slot_duration are required' });
      return;
    }

    if (user.role === 'lecturer' && user.department_id !== department_id) {
      res.status(403).json({ status: 'error', message: 'Lecturer can only create sessions for their department' });
      return;
    }
    if (user.role === 'dept_admin' && user.department_id !== department_id) {
      res.status(403).json({ status: 'error', message: 'You can only create sessions for your department' });
      return;
    }

    const vis =
      user.role === 'lecturer'
        ? (visibility === 'OPEN' ? 'OPEN' : 'RESTRICTED')
        : (visibility === 'RESTRICTED' ? 'RESTRICTED' : 'OPEN');
    const startTimeDate = new Date(`${date}T${start_time.includes(':') && start_time.length <= 5 ? start_time + ':00' : start_time}`);
    if (isNaN(startTimeDate.getTime())) {
      res.status(400).json({ status: 'error', message: 'Invalid start_time format (use HH:mm or HH:mm:ss)' });
      return;
    }

    const session = await prisma.session.create({
      data: {
        title: title.trim(),
        department_id,
        created_by: user.id,
        date: new Date(date),
        start_time: startTimeDate,
        capacity: Number(capacity),
        slot_duration: Number(slot_duration),
        visibility: vis,
        priority_enabled: Boolean(priority_enabled),
      },
      include: { department: { select: { id: true, name: true } } },
    });
    res.status(201).json({ status: 'success', data: { session } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /admin/sessions/:id — get single session (must be creator or same dept)
 */
export async function getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    res.json({ status: 'success', data: { session } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /admin/sessions/:id/state — transition state (strict state machine, log to session_log)
 */
export async function updateSessionState(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { state: newState } = req.body as { state?: string };
    if (!newState) {
      res.status(400).json({ status: 'error', message: 'state is required' });
      return;
    }

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const allowed = VALID_TRANSITIONS[session.state];
    if (!allowed || !allowed.includes(newState)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid transition: ${session.state} → ${newState}. Allowed: ${allowed?.join(', ') || 'none'}`,
      });
      return;
    }

    await prisma.$transaction([
      prisma.session.update({ where: { id }, data: { state: newState } }),
      prisma.sessionLog.create({
        data: {
          session_id: id,
          admin_id: req.user!.id,
          action: 'state_changed',
          metadata: { from: session.state, to: newState },
        },
      }),
    ]);

    const updated = await prisma.session.findUnique({
      where: { id },
      include: { department: { select: { id: true, name: true } } },
    });
    res.json({ status: 'success', data: { session: updated } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /admin/sessions/:id — only if state is DRAFT
 */
export async function deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    if (session.state !== 'DRAFT') {
      res.status(400).json({ status: 'error', message: 'Can only delete sessions in DRAFT state' });
      return;
    }
    await prisma.session.delete({ where: { id } });
    res.json({ status: 'success', data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/users — create dept_admin or lecturer (superadmin only)
 * dept_admin: department_id required (operational department: CITS, Medical Center, etc.)
 * lecturer: course_id required (course/programme; backend resolves to a department by name for restricted sessions)
 */
export async function createAdminUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, full_name, role, department_id, course_id } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: string;
      department_id?: string;
      course_id?: string;
    };

    if (!email?.trim() || !password || !full_name?.trim() || !role) {
      res.status(400).json({ status: 'error', message: 'email, password, full_name, and role are required' });
      return;
    }
    if (role !== 'dept_admin' && role !== 'lecturer') {
      res.status(400).json({ status: 'error', message: 'role must be dept_admin or lecturer' });
      return;
    }
    if (role === 'dept_admin' && !department_id) {
      res.status(400).json({ status: 'error', message: 'department_id is required for dept_admin' });
      return;
    }
    if (role === 'lecturer' && !course_id) {
      res.status(400).json({ status: 'error', message: 'course_id is required for lecturer. Students in this course will see their restricted sessions.' });
      return;
    }

    let resolvedDepartmentId: string | null = null;
    if (role === 'dept_admin') {
      resolvedDepartmentId = department_id!;
    } else if (role === 'lecturer') {
      const course = await prisma.course.findUnique({ where: { id: course_id! }, select: { name: true } });
      if (!course) {
        res.status(400).json({ status: 'error', message: 'Invalid course_id' });
        return;
      }
      let dept = await prisma.department.findUnique({ where: { name: course.name }, select: { id: true } });
      if (!dept) {
        const created = await prisma.department.create({
          data: { name: course.name, description: `Course / programme: ${course.name}`, created_by: req.user!.id },
          select: { id: true },
        });
        dept = created;
      }
      resolvedDepartmentId = dept.id;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password_hash,
        full_name: full_name.trim(),
        role,
        department_id: resolvedDepartmentId,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        department_id: true,
        created_at: true,
      },
    });
    res.status(201).json({ status: 'success', data: { user } });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      res.status(409).json({ status: 'error', message: 'A user with this email already exists.' });
      return;
    }
    next(err);
  }
}

/**
 * GET /admin/sessions/:id/queue — admin: full queue list for live session
 */
export async function getSessionQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.params.id as string;
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const entries = await prisma.queueEntry.findMany({
      where: { session_id: sessionId },
      orderBy: { queue_number: 'asc' },
      include: { student: { select: { id: true, full_name: true, email: true, matric_number: true } } },
    });
    res.json({
      status: 'success',
      data: {
        session: { id: session.id, title: session.title, current_serving: session.current_serving ?? 0, state: session.state },
        entries,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/sessions/:id/queue/next — admin calls next student
 */
export async function callNext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.params.id as string;
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    if (session.state !== 'ACTIVE') {
      res.status(400).json({ status: 'error', message: 'Session must be ACTIVE to call next' });
      return;
    }

    const currentServing = session.current_serving ?? 0;
    const now = new Date();
    const nextEntry = await prisma.queueEntry.findFirst({
      where: { session_id: sessionId, status: 'waiting', queue_number: { gt: currentServing } },
      orderBy: { queue_number: 'asc' },
    });
    if (!nextEntry) {
      res.status(400).json({ status: 'error', message: 'No one waiting in queue' });
      return;
    }

    const previousServing = await prisma.queueEntry.findFirst({
      where: { session_id: sessionId, status: 'serving' },
    });

    await prisma.$transaction([
      ...(previousServing
        ? [
            prisma.queueEntry.update({
              where: { id: previousServing.id },
              data: { status: 'completed', served_at: now },
            }),
          ]
        : []),
      prisma.queueEntry.update({
        where: { id: nextEntry.id },
        data: { status: 'serving' },
      }),
      prisma.session.update({
        where: { id: sessionId },
        data: { current_serving: nextEntry.queue_number },
      }),
      prisma.sessionLog.create({
        data: {
          session_id: sessionId,
          admin_id: req.user!.id,
          action: 'called',
          metadata: { queue_number: nextEntry.queue_number, student_id: nextEntry.student_id },
        },
      }),
    ]);

    const waitingCount = await prisma.queueEntry.count({
      where: { session_id: sessionId, status: 'waiting' },
    });
    socketService.queueUpdate(sessionId, {
      currentServing: nextEntry.queue_number,
      totalWaiting: waitingCount,
      estimatedWaitMinutes: waitingCount * session.slot_duration,
    });

    const threeAhead = await prisma.queueEntry.findFirst({
      where: {
        session_id: sessionId,
        status: 'waiting',
        queue_number: nextEntry.queue_number + 3,
      },
    });
    if (threeAhead) {
      socketService.yourTurnSoon(sessionId, threeAhead.student_id, {
        positionsAhead: 3,
        estimatedMinutes: 3 * session.slot_duration,
      });
    }

    res.json({
      status: 'success',
      data: { currentServing: nextEntry.queue_number, student_id: nextEntry.student_id },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/sessions/:id/queue/complete — mark the current serving person as done (no one called next)
 */
export async function markCurrentDone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.params.id as string;
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { department: { select: { id: true } } },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    if (session.state !== 'ACTIVE') {
      res.status(400).json({ status: 'error', message: 'Session must be ACTIVE' });
      return;
    }

    const servingEntry = await prisma.queueEntry.findFirst({
      where: { session_id: sessionId, status: 'serving' },
    });
    if (!servingEntry) {
      res.status(400).json({ status: 'error', message: 'No one is currently being served' });
      return;
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.queueEntry.update({
        where: { id: servingEntry.id },
        data: { status: 'completed', served_at: now },
      }),
      prisma.session.update({
        where: { id: sessionId },
        data: { current_serving: 0 },
      }),
      prisma.sessionLog.create({
        data: {
          session_id: sessionId,
          admin_id: req.user!.id,
          action: 'completed',
          metadata: { queue_number: servingEntry.queue_number, student_id: servingEntry.student_id },
        },
      }),
    ]);

    const waitingCount = await prisma.queueEntry.count({
      where: { session_id: sessionId, status: 'waiting' },
    });
    socketService.queueUpdate(sessionId, {
      currentServing: 0,
      totalWaiting: waitingCount,
      estimatedWaitMinutes: waitingCount * session.slot_duration,
    });

    res.json({
      status: 'success',
      data: { message: 'Marked as done', queue_number: servingEntry.queue_number },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /admin/sessions/:id/queue/skip — admin skips a student (mark no_show, promote waitlist)
 */
export async function skipStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.params.id as string;
    const { queue_number: queueNumber } = req.body as { queue_number?: number };
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { department: { select: { id: true } } },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    if (!queueNumber) {
      res.status(400).json({ status: 'error', message: 'queue_number is required' });
      return;
    }

    const entry = await prisma.queueEntry.findFirst({
      where: { session_id: sessionId, queue_number: queueNumber, status: { in: ['waiting', 'serving'] } },
    });
    if (!entry) {
      res.status(404).json({ status: 'error', message: 'Queue entry not found' });
      return;
    }

    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { status: 'no_show' },
    });
    await prisma.session.update({
      where: { id: sessionId },
      data: { total_enrolled: { decrement: 1 } },
    });
    await prisma.sessionLog.create({
      data: {
        session_id: sessionId,
        admin_id: req.user!.id,
        action: 'skipped',
        metadata: { queue_number: queueNumber, student_id: entry.student_id },
      },
    });

    await compactQueue(sessionId);

    socketService.studentNoShow(session.department_id, {
      sessionId,
      queueNumber,
      studentId: entry.student_id,
    });

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

    res.json({ status: 'success', data: { skipped: queueNumber, promoted: !!promoted } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /admin/sessions/:id/queue/entries/:entryId/priority — admin sets priority (routine | urgent | emergency)
 */
export async function setEntryPriorityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.params.id as string;
    const entryId = req.params.entryId as string;
    const { priority_level: priorityLevel } = req.body as { priority_level?: 'routine' | 'urgent' | 'emergency' };

    if (!priorityLevel || !['routine', 'urgent', 'emergency'].includes(priorityLevel)) {
      res.status(400).json({ status: 'error', message: 'priority_level must be routine, urgent, or emergency' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { department: { select: { id: true } } },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (!canAccessSession(req.user!, session)) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    if (session.state !== 'ACTIVE' && session.state !== 'OPEN') {
      res.status(400).json({ status: 'error', message: 'Session must be OPEN or ACTIVE' });
      return;
    }

    await setEntryPriority(sessionId, entryId, priorityLevel);

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
      message:
        priorityLevel !== 'routine'
          ? 'Queue order was updated (priority). Your position may have changed.'
          : undefined,
    });

    res.json({ status: 'success', data: { priority_level: priorityLevel } });
  } catch (err) {
    const e = err as Error;
    if (e.message === 'Session not found' || e.message === 'Queue entry not found') {
      res.status(404).json({ status: 'error', message: e.message });
      return;
    }
    next(err);
  }
}
