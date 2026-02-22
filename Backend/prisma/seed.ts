import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const SALT_ROUNDS = 12;

async function main() {
  const superadminHash = await bcrypt.hash('SuperAdmin123!', SALT_ROUNDS);
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@unilag.edu.ng' },
    update: {},
    create: {
      email: 'superadmin@unilag.edu.ng',
      password_hash: superadminHash,
      full_name: 'Super Administrator',
      role: 'superadmin',
    },
  });

  const deptNames = ['Medical Center', 'CITS', 'Computer Science'] as const;
  const departments: { id: string; name: string; description: string | null }[] = [];
  for (const name of deptNames) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: name === 'Medical Center' ? 'Campus medical services' : name === 'CITS' ? 'ID capture and IT services' : 'Computer Science Department',
        created_by: superadmin.id,
      },
    });
    departments.push(dept);
  }

  const courseNames = [
    'Computer Science',
    'Electrical and Electronics Engineering',
    'Law',
    'Medicine',
    'Business Administration',
    'Accounting',
    'Mass Communication',
    'Economics',
    'Psychology',
    'Sociology',
  ];
  for (const name of courseNames) {
    await prisma.course.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const medicalId = departments.find((d) => d.name === 'Medical Center')!.id;
  const citsId = departments.find((d) => d.name === 'CITS')!.id;
  const csId = departments.find((d) => d.name === 'Computer Science')!.id;

  const adminHash = await bcrypt.hash('DeptAdmin123!', SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'medical@unilag.edu.ng' },
    update: {},
    create: {
      email: 'medical@unilag.edu.ng',
      password_hash: adminHash,
      full_name: 'Medical Center Admin',
      role: 'dept_admin',
      department_id: medicalId,
    },
  });
  await prisma.user.upsert({
    where: { email: 'cits@unilag.edu.ng' },
    update: {},
    create: {
      email: 'cits@unilag.edu.ng',
      password_hash: adminHash,
      full_name: 'CITS Admin',
      role: 'dept_admin',
      department_id: citsId,
    },
  });

  const lecturerHash = await bcrypt.hash('Lecturer123!', SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'lecturer@unilag.edu.ng' },
    update: {},
    create: {
      email: 'lecturer@unilag.edu.ng',
      password_hash: lecturerHash,
      full_name: 'Dr. Office Hours',
      role: 'lecturer',
      department_id: csId,
    },
  });

  const studentHash = await bcrypt.hash('Student123!', SALT_ROUNDS);
  const students = [
    { matric: '180201001', email: 'student1@unilag.edu.ng', name: 'Student One', faculty: 'Engineering', department: 'Computer Science' },
    { matric: '180201002', email: 'student2@unilag.edu.ng', name: 'Student Two', faculty: 'Engineering', department: 'Computer Science' },
    { matric: '180301001', email: 'student3@unilag.edu.ng', name: 'Student Three', faculty: 'Law', department: 'Law' },
    { matric: '180201003', email: 'student4@unilag.edu.ng', name: 'Student Four', faculty: 'Engineering', department: 'Computer Science' },
    { matric: '180201004', email: 'student5@unilag.edu.ng', name: 'Student Five', faculty: 'Engineering', department: 'Computer Science' },
  ];
  const medicalAdmin = await prisma.user.findFirstOrThrow({ where: { email: 'medical@unilag.edu.ng' }, select: { id: true } });
  const lecturerUser = await prisma.user.findFirstOrThrow({ where: { email: 'lecturer@unilag.edu.ng' }, select: { id: true } });

  for (const s of students) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        matric_number: s.matric,
        email: s.email,
        password_hash: studentHash,
        full_name: s.name,
        role: 'student',
        faculty: s.faculty,
        department: s.department,
      },
    });
  }

  // Demo sessions for today: one Medical Center (OPEN), one CS Lecturer (RESTRICTED, ACTIVE)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startTime = new Date('1970-01-01T09:00:00Z');
  const afternoon = new Date('1970-01-01T14:00:00Z');

  await prisma.session.upsert({
    where: { id: 'seed-medical-today' },
    update: {
      state: 'OPEN',
      date: today,
      title: 'Morning Consultation',
      capacity: 20,
      slot_duration: 15,
      total_enrolled: 0,
      current_serving: 0,
    },
    create: {
      id: 'seed-medical-today',
      title: 'Morning Consultation',
      department_id: medicalId,
      created_by: medicalAdmin.id,
      date: today,
      start_time: startTime,
      capacity: 20,
      slot_duration: 15,
      visibility: 'OPEN',
      priority_enabled: true,
      state: 'OPEN',
    },
  });

  await prisma.session.upsert({
    where: { id: 'seed-cs-office-today' },
    update: {
      state: 'ACTIVE',
      date: today,
      title: 'CS Office Hours',
      capacity: 10,
      slot_duration: 15,
      total_enrolled: 0,
      current_serving: 0,
    },
    create: {
      id: 'seed-cs-office-today',
      title: 'CS Office Hours',
      department_id: csId,
      created_by: lecturerUser.id,
      date: today,
      start_time: afternoon,
      capacity: 10,
      slot_duration: 15,
      visibility: 'RESTRICTED',
      priority_enabled: false,
      state: 'ACTIVE',
    },
  });

  console.log('Seed completed: superadmin, 3 departments, courses, 2 dept_admins, 1 lecturer, 5 students, 2 demo sessions for today.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
