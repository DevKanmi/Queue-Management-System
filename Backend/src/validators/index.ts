import { z } from 'zod';

// ----- Auth -----
export const registerBody = z.object({
  matric_number: z.string().min(1, 'Matric number is required'),
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required').trim(),
  phone: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().min(1, 'Course / programme is required').trim(),
});

export const loginBody = z.object({
  email: z.string().optional(),
  matric_number: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((d) => (d.email?.trim() ?? '') !== '' || (d.matric_number?.trim() ?? '') !== '', {
  message: 'Email or matric number is required',
});

export const refreshBody = z.object({
  refresh_token: z.string().min(1, 'refresh_token is required'),
});

// ----- Queue -----
export const joinQueueBody = z.object({
  priority_level: z.enum(['routine', 'urgent', 'emergency']).optional(),
}).transform((d) => ({ priority_level: d.priority_level ?? 'routine' as const }));

// ----- Admin: create session -----
export const createSessionBody = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  department_id: z.string().uuid('Invalid department'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  start_time: z.string().min(1, 'Start time is required'),
  capacity: z.coerce.number().int().min(1).max(1000),
  slot_duration: z.coerce.number().int().min(5).max(120),
  visibility: z.enum(['OPEN', 'RESTRICTED']).optional(),
  priority_enabled: z.boolean().optional(),
}).transform((d) => ({
  ...d,
  visibility: (d.visibility ?? 'OPEN') as 'OPEN' | 'RESTRICTED',
  priority_enabled: d.priority_enabled ?? false,
}));

// ----- Admin: update session state -----
export const updateSessionStateBody = z.object({
  state: z.enum(['OPEN', 'ACTIVE', 'PAUSED', 'CLOSED']),
});

// ----- Admin: create user (dept_admin or lecturer) -----
export const createAdminUserBody = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required').trim(),
  role: z.enum(['dept_admin', 'lecturer']),
  department_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
}).refine(
  (d) => {
    if (d.role === 'dept_admin') return !!d.department_id;
    if (d.role === 'lecturer') return !!d.course_id;
    return true;
  },
  { message: 'department_id required for dept_admin; course_id required for lecturer' }
);

// ----- Admin: set entry priority -----
export const setEntryPriorityBody = z.object({
  priority_level: z.enum(['routine', 'urgent', 'emergency']),
});

// ----- Departments -----
export const createDepartmentBody = z.object({
  name: z.string().min(1, 'Department name is required').trim(),
  description: z.string().optional(),
});

// ----- Courses -----
export const createCourseBody = z.object({
  name: z.string().min(1, 'Course name is required').trim(),
});

// ----- Notifications -----
export const markReadParams = z.object({ id: z.string().uuid() });
