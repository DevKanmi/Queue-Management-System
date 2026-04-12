import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { compactQueue, promoteFromWaitlist } from '../services/queue.service';
import * as socketService from '../services/socket.service';
import { sendGuestPositionReminderEmail } from '../services/notification.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const POSITION_REMINDER_THRESHOLD = 3; // send reminder when this many people are ahead

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['OPEN'],
  OPEN: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['PAUSED', 'CLOSED'],
  PAUSED: ['ACTIVE'],
  CLOSED: [],
};

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

async function getOrgForUser(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: { members: true },
  });
  if (!org) return { org: null, error: 'Organization not found', statusCode: 404 };
  const isMember = org.owner_id === userId || org.members.some((m) => m.user_id === userId);
  if (!isMember) return { org: null, error: 'Access denied', statusCode: 403 };
  return { org, error: null, statusCode: 200 };
}

/**
 * POST /orgs — Create organization
 */
export async function createOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) {
      res.status(400).json({ status: 'error', message: 'Organization name is required' });
      return;
    }
    // One org per organizer
    const existing = await prisma.organization.findFirst({ where: { owner_id: user.id } });
    if (existing) {
      res.status(400).json({ status: 'error', message: 'You already have an organization', data: { slug: existing.slug } });
      return;
    }

    const baseSlug = slugify(name.trim());
    if (!baseSlug) {
      res.status(400).json({ status: 'error', message: 'Name must contain at least one alphanumeric character' });
      return;
    }

    // Ensure unique slug
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        owner_id: user.id,
        members: {
          create: { user_id: user.id, role: 'owner' },
        },
      },
      include: { members: true },
    });
    res.status(201).json({ status: 'success', data: { org } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orgs — List orgs where user is owner or member
 */
export async function listMyOrgs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const orgs = await prisma.organization.findMany({
      where: {
        OR: [
          { owner_id: user.id },
          { members: { some: { user_id: user.id } } },
        ],
      },
      include: { _count: { select: { sessions: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json({ status: 'success', data: { orgs } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orgs/:slug — Org details
 */
export async function getOrg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug } = req.params as { slug: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    res.json({ status: 'success', data: { org } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /orgs/:slug/sessions — Create session for org
 */
export async function createOrgSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug } = req.params as { slug: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }

    const { title, date, start_time, capacity, slot_duration, visibility } = req.body as {
      title?: string;
      date?: string;
      start_time?: string;
      capacity?: number;
      slot_duration?: number;
      visibility?: string;
    };

    if (!title?.trim() || !date || !start_time || capacity == null || slot_duration == null) {
      res.status(400).json({ status: 'error', message: 'title, date, start_time, capacity, slot_duration are required' });
      return;
    }

    // Generate unique join_code
    let join_code = generateJoinCode();
    let attempts = 0;
    while (await prisma.session.findUnique({ where: { join_code } })) {
      join_code = generateJoinCode();
      if (++attempts > 10) throw new Error('Failed to generate unique join code');
    }

    const session = await prisma.session.create({
      data: {
        title: title.trim(),
        org_id: org.id,
        join_code,
        created_by: user.id,
        date: new Date(date),
        start_time: new Date(`1970-01-01T${start_time}:00.000Z`),
        capacity: Number(capacity),
        slot_duration: Number(slot_duration),
        visibility: visibility?.toUpperCase() === 'RESTRICTED' ? 'RESTRICTED' : 'OPEN',
        state: 'OPEN',
      },
    });
    res.status(201).json({ status: 'success', data: { session } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orgs/:slug/sessions — List sessions for org
 */
export async function listOrgSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug } = req.params as { slug: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    const sessions = await prisma.session.findMany({
      where: { org_id: org.id },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    });
    res.json({ status: 'success', data: { sessions } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orgs/:slug/sessions/:id — Get single org session
 */
export async function getOrgSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug, id } = req.params as { slug: string; id: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    const session = await prisma.session.findFirst({
      where: { id, org_id: org.id },
    });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    res.json({ status: 'success', data: { session } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /orgs/:slug/sessions/:id/state — Update session state
 */
export async function updateOrgSessionState(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug, id } = req.params as { slug: string; id: string };
    const { state } = req.body as { state?: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    const session = await prisma.session.findFirst({ where: { id, org_id: org.id } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    const newState = state?.toUpperCase();
    if (!newState) {
      res.status(400).json({ status: 'error', message: 'state is required' });
      return;
    }
    const allowed = VALID_TRANSITIONS[session.state] ?? [];
    if (!allowed.includes(newState)) {
      res.status(400).json({ status: 'error', message: `Cannot transition from ${session.state} to ${newState}` });
      return;
    }
    const updated = await prisma.session.update({ where: { id }, data: { state: newState } });
    socketService.sessionStateChanged(id, newState);
    await prisma.sessionLog.create({
      data: { session_id: id, admin_id: user.id, action: 'state_changed', metadata: { from: session.state, to: newState } },
    });
    res.json({ status: 'success', data: { session: updated } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /orgs/:slug/sessions/:id/queue — Full queue for org session
 */
export async function getOrgQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug, id } = req.params as { slug: string; id: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    const session = await prisma.session.findFirst({ where: { id, org_id: org.id } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    const entries = await prisma.queueEntry.findMany({
      where: { session_id: id },
      include: { student: { select: { id: true, full_name: true, matric_number: true, email: true } } },
      orderBy: { queue_number: 'asc' },
    });
    res.json({ status: 'success', data: { entries, session } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /orgs/:slug/sessions/:id/queue/next — Call next person
 */
export async function callNext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug, id } = req.params as { slug: string; id: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    const session = await prisma.session.findFirst({ where: { id, org_id: org.id } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }
    if (session.state !== 'ACTIVE') {
      res.status(400).json({ status: 'error', message: 'Session must be ACTIVE' });
      return;
    }

    const nextEntry = await prisma.queueEntry.findFirst({
      where: { session_id: id, status: 'waiting' },
      orderBy: { queue_number: 'asc' },
    });
    if (!nextEntry) {
      res.status(400).json({ status: 'error', message: 'No one waiting in queue' });
      return;
    }

    await prisma.queueEntry.updateMany({ where: { session_id: id, status: 'serving' }, data: { status: 'completed', served_at: new Date() } });
    await prisma.queueEntry.update({ where: { id: nextEntry.id }, data: { status: 'serving' } });
    await prisma.session.update({ where: { id }, data: { current_serving: nextEntry.queue_number } });

    await prisma.sessionLog.create({ data: { session_id: id, admin_id: user.id, action: 'called', metadata: { queue_number: nextEntry.queue_number } } });

    const waitingCount = await prisma.queueEntry.count({ where: { session_id: id, status: 'waiting' } });
    socketService.queueUpdate(id, { currentServing: nextEntry.queue_number, totalWaiting: waitingCount, estimatedWaitMinutes: waitingCount * session.slot_duration });

    // Send position reminder to the guest who is now POSITION_REMINDER_THRESHOLD places away.
    // Failure leaves reminder_sent=false so the scheduler recovery job will retry.
    if (session.join_code) {
      const waitingEntries = await prisma.queueEntry.findMany({
        where: { session_id: id, status: 'waiting' },
        orderBy: { queue_number: 'asc' },
        take: POSITION_REMINDER_THRESHOLD + 1,
      });
      const targetEntry = waitingEntries[POSITION_REMINDER_THRESHOLD - 1]; // 0-indexed → index 2 = 3rd waiting
      if (targetEntry && targetEntry.guest_email && targetEntry.guest_token && !targetEntry.reminder_sent) {
        const statusUrl = `${FRONTEND_URL}/q/${session.join_code}/status?token=${targetEntry.guest_token}`;
        sendGuestPositionReminderEmail(
          targetEntry.guest_email,
          targetEntry.guest_name ?? 'Guest',
          session.title,
          targetEntry.queue_number,
          POSITION_REMINDER_THRESHOLD - 1, // people ahead at time of sending
          statusUrl
        )
          .then(() => prisma.queueEntry.update({ where: { id: targetEntry.id }, data: { reminder_sent: true } }))
          .catch((err) => console.error('[Orgs] Failed to send position reminder:', err));
      }
    }

    res.json({ status: 'success', data: { queue_number: nextEntry.queue_number } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /orgs/:slug/sessions/:id/queue/complete — Mark current as done
 */
export async function markDone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug, id } = req.params as { slug: string; id: string };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    const session = await prisma.session.findFirst({ where: { id, org_id: org.id } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }

    const serving = await prisma.queueEntry.findFirst({ where: { session_id: id, status: 'serving' } });
    if (!serving) {
      res.status(400).json({ status: 'error', message: 'No one is currently being served' });
      return;
    }

    await prisma.queueEntry.update({ where: { id: serving.id }, data: { status: 'completed', served_at: new Date() } });
    await prisma.session.update({ where: { id }, data: { current_serving: 0 } });
    await prisma.sessionLog.create({ data: { session_id: id, admin_id: user.id, action: 'called', metadata: { completed: serving.queue_number } } });

    const waitingCount = await prisma.queueEntry.count({ where: { session_id: id, status: 'waiting' } });
    socketService.queueUpdate(id, { currentServing: 0, totalWaiting: waitingCount });

    res.json({ status: 'success', data: { message: 'Marked as done' } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /orgs/:slug/sessions/:id/queue/skip — Skip current/specified entry
 */
export async function skipEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { slug, id } = req.params as { slug: string; id: string };
    const { queue_number } = req.body as { queue_number?: number };
    const { org, error, statusCode } = await getOrgForUser(slug, user.id);
    if (!org) {
      res.status(statusCode).json({ status: 'error', message: error });
      return;
    }
    const session = await prisma.session.findFirst({ where: { id, org_id: org.id } });
    if (!session) {
      res.status(404).json({ status: 'error', message: 'Session not found' });
      return;
    }

    const entry = queue_number
      ? await prisma.queueEntry.findFirst({ where: { session_id: id, queue_number, status: { in: ['waiting', 'serving'] } } })
      : await prisma.queueEntry.findFirst({ where: { session_id: id, status: 'serving' } });

    if (!entry) {
      res.status(404).json({ status: 'error', message: 'Entry not found' });
      return;
    }

    await prisma.queueEntry.update({ where: { id: entry.id }, data: { status: 'no_show' } });
    await prisma.session.update({ where: { id }, data: { total_enrolled: { decrement: 1 } } });

    await compactQueue(id);
    await promoteFromWaitlist(id);

    await prisma.sessionLog.create({ data: { session_id: id, admin_id: user.id, action: 'skipped', metadata: { queue_number: entry.queue_number } } });

    const updatedSession = await prisma.session.findUnique({ where: { id }, select: { current_serving: true, slot_duration: true } });
    const waitingCount = await prisma.queueEntry.count({ where: { session_id: id, status: 'waiting' } });
    socketService.queueUpdate(id, { currentServing: updatedSession?.current_serving ?? 0, totalWaiting: waitingCount });

    res.json({ status: 'success', data: { message: 'Entry skipped' } });
  } catch (err) {
    next(err);
  }
}
