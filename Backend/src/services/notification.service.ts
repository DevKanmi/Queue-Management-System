import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let transporterVerified = false;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Emails will not be sent.');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

const FROM = process.env.SMTP_USER;

/**
 * Send a plain text email. Throws if SMTP fails so callers can log. No-op if SMTP not configured.
 * Does not call verify() first (avoids slow/timeout on first send); sendMail will fail if connection is bad.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const trans = getTransporter();
  if (!trans) return;
  if (!transporterVerified) {
    try {
      await trans.verify();
    } catch {
      // Verify often times out behind firewalls; continue and let sendMail try
    }
    transporterVerified = true;
  }
  await trans.sendMail({ from: FROM, to, subject, text });
}

/**
 * Send queue confirmation email to student.
 */
export async function sendConfirmationEmail(
  to: string,
  sessionTitle: string,
  queueNumber: number,
  assignedTime: Date
): Promise<void> {
  const subject = `Queue confirmation: ${sessionTitle}`;
  const text = `You have joined the queue for "${sessionTitle}".\n\nYour queue number: ${queueNumber}\nEstimated time: ${assignedTime.toLocaleString()}\n\nPlease arrive shortly before your estimated time.`;
  await sendEmail(to, subject, text);
}

/**
 * Send waitlist promotion email.
 */
export async function sendPromotionEmail(
  to: string,
  sessionTitle: string,
  queueNumber: number,
  assignedTime: Date
): Promise<void> {
  const subject = `You're in! Waitlist promotion: ${sessionTitle}`;
  const text = `You have been promoted from the waitlist for "${sessionTitle}".\n\nYour queue number: ${queueNumber}\nEstimated time: ${assignedTime.toLocaleString()}\n\nPlease arrive shortly before your estimated time.`;
  await sendEmail(to, subject, text);
}

/**
 * Send reminder email (e.g. 30 minutes before slot).
 */
export async function sendReminderEmail(
  to: string,
  sessionTitle: string,
  queueNumber: number,
  assignedTime: Date
): Promise<void> {
  const subject = `Reminder: Your queue slot — ${sessionTitle}`;
  const text = `Reminder: You have a queue slot for "${sessionTitle}".\n\nYour queue number: ${queueNumber}\nYour estimated time: ${assignedTime.toLocaleString()}\n\nPlease arrive shortly before your time.`;
  await sendEmail(to, subject, text);
}

/**
 * Retry wrapper — attempts up to maxAttempts times with increasing delays.
 * Throws the last error if all attempts fail.
 */
async function sendWithRetry(fn: () => Promise<void>, maxAttempts = 3): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fn();
      return;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }
  throw lastError;
}

/**
 * Confirmation email for anonymous (guest) queue joiners.
 * Includes a persistent status URL with their token embedded so they can
 * return to track their position even after closing the browser tab.
 */
export async function sendGuestConfirmationEmail(
  to: string,
  name: string,
  sessionTitle: string,
  queueNumber: number,
  statusUrl: string
): Promise<void> {
  const subject = `You're in the queue — ${sessionTitle}`;
  const text = [
    `Hi ${name},`,
    ``,
    `You've successfully joined the queue for "${sessionTitle}".`,
    ``,
    `Your queue number: #${queueNumber}`,
    ``,
    `Track your live position here (works even after closing your browser tab):`,
    statusUrl,
    ``,
    `We'll email you again when it's nearly your turn — no need to keep your browser open.`,
    ``,
    `See you soon!`,
  ].join('\n');
  await sendWithRetry(() => sendEmail(to, subject, text));
}

/**
 * Position-based reminder email for anonymous (guest) queue joiners.
 * Sent when they are ≤ POSITION_REMINDER_THRESHOLD people away.
 */
export async function sendGuestPositionReminderEmail(
  to: string,
  name: string,
  sessionTitle: string,
  queueNumber: number,
  peopleAhead: number,
  statusUrl: string
): Promise<void> {
  const subject = `Almost your turn — ${sessionTitle}`;
  const aheadText =
    peopleAhead === 0
      ? "You're next!"
      : peopleAhead === 1
      ? '1 person is ahead of you'
      : `${peopleAhead} people are ahead of you`;
  const text = [
    `Hi ${name},`,
    ``,
    `Heads up! ${aheadText} in the queue for "${sessionTitle}" (your number: #${queueNumber}).`,
    ``,
    `Head over now to check your live position:`,
    statusUrl,
    ``,
    `See you soon!`,
  ].join('\n');
  await sendWithRetry(() => sendEmail(to, subject, text));
}
