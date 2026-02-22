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
