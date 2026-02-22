/**
 * Concurrency test: simulate many students joining the same session simultaneously.
 * Asserts that exactly `capacity` get slots and the rest get waitlist (no double-assignment).
 * Run: npm run test:concurrency (or npx tsx src/scripts/concurrency-join.test.ts)
 * Uses 20 students and capacity 5 to avoid transaction timeouts; increase NUM_STUDENTS for heavier load.
 */
import 'dotenv/config';
import { prisma } from '../config/db';
import { joinQueue } from '../services/queue.service';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const CAPACITY = 5;
const NUM_STUDENTS = 20;

async function main() {
  const csDept = await prisma.department.findFirst({ where: { name: 'Computer Science' } });
  if (!csDept) {
    console.error('No Computer Science department. Run seed first.');
    process.exit(1);
  }

  const hash = await bcrypt.hash('TestStudent123!', SALT_ROUNDS);
  const studentIds: string[] = [];

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const email = `concurrency.student.${i}@test.unilag.edu.ng`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password_hash: hash,
        full_name: `Concurrency Student ${i}`,
        role: 'student',
        matric_number: `TEST${200000 + i}`,
        department: 'Computer Science',
        faculty: 'Engineering',
      },
      select: { id: true },
    });
    studentIds.push(user.id);
  }

  const admin = await prisma.user.findFirst({ where: { role: 'dept_admin' }, select: { id: true } });
  if (!admin) {
    console.error('No dept_admin user. Run seed first.');
    process.exit(1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let session = await prisma.session.findFirst({
    where: { state: 'OPEN', department_id: csDept.id },
    select: { id: true, capacity: true },
  });
  if (!session) {
    session = await prisma.session.create({
      data: {
        title: 'Concurrency Test Session',
        department_id: csDept.id,
        created_by: admin.id,
        date: today,
        start_time: new Date('1970-01-01T09:00:00'),
        capacity: CAPACITY,
        slot_duration: 15,
        visibility: 'OPEN',
        state: 'OPEN',
      },
      select: { id: true, capacity: true },
    });
  } else {
    await prisma.session.update({
      where: { id: session.id },
      data: { capacity: CAPACITY, total_enrolled: 0, current_serving: 0 },
    });
  }

  await prisma.queueEntry.deleteMany({ where: { session_id: session.id } });
  await prisma.noShowWaitlist.deleteMany({ where: { session_id: session.id } });
  await prisma.session.update({
    where: { id: session.id },
    data: { total_enrolled: 0, current_serving: 0 },
  });

  const results = await Promise.all(
    studentIds.map((studentId) =>
      joinQueue(session.id, studentId, 'routine').then((r) => ({ studentId, ...r }))
    )
  );

  const slots = results.filter((r) => r.type === 'slot');
  const waitlist = results.filter((r) => r.type === 'waitlist');
  const queueNumbers = slots.map((s) => (s as { type: 'slot'; entry: { queue_number: number } }).entry.queue_number);
  const uniqueNumbers = new Set(queueNumbers);

  console.log(`Joined: ${slots.length} slots, ${waitlist.length} waitlist (capacity=${CAPACITY}, students=${NUM_STUDENTS})`);

  const okSlots = slots.length === CAPACITY;
  const okWaitlist = waitlist.length === NUM_STUDENTS - CAPACITY;
  const noDuplicates = uniqueNumbers.size === queueNumbers.length && queueNumbers.length === CAPACITY;

  if (okSlots && okWaitlist && noDuplicates) {
    console.log('PASS: Concurrency test — correct slot count and no duplicate queue numbers.');
  } else {
    console.error('FAIL:', { okSlots, okWaitlist, noDuplicates, uniqueNumbers: uniqueNumbers.size });
    process.exit(1);
  }

  await prisma.queueEntry.deleteMany({ where: { session_id: session.id } });
  await prisma.noShowWaitlist.deleteMany({ where: { session_id: session.id } });
  await prisma.session.update({
    where: { id: session.id },
    data: { total_enrolled: 0 },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
