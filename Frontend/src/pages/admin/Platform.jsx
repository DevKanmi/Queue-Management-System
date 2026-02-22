import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { api } from '../../services/api';

export default function Platform() {
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [deptError, setDeptError] = useState('');
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  const [userError, setUserError] = useState('');
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'dept_admin',
    department_id: '',
    course_id: '',
  });
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userSuccess, setUserSuccess] = useState('');

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseError, setCourseError] = useState('');
  const [courseForm, setCourseForm] = useState({ name: '' });
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  const loadDepartments = () => {
    setDepartmentsLoading(true);
    setDeptError('');
    api
      .get('/departments')
      .then((res) => {
        const list = res?.data?.data?.departments ?? res?.data?.departments ?? [];
        setDepartments(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        setDepartments([]);
        setDeptError(err.response?.data?.message || 'Could not load departments.');
      })
      .finally(() => setDepartmentsLoading(false));
  };

  const loadCourses = () => {
    setCoursesLoading(true);
    setCourseError('');
    api
      .get('/courses/options')
      .then((res) => {
        const list = res?.data?.data?.courses ?? res?.data?.courses ?? [];
        setCourses(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        setCourses([]);
        setCourseError(err.response?.data?.message || 'Could not load courses.');
      })
      .finally(() => setCoursesLoading(false));
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadCourses();
  }, []);

  const handleCreateDepartment = (e) => {
    e.preventDefault();
    setDeptError('');
    if (!deptForm.name?.trim()) {
      setDeptError('Department name is required.');
      return;
    }
    setDeptSubmitting(true);
    api
      .post('/departments', {
        name: deptForm.name.trim(),
        description: deptForm.description?.trim() || undefined,
      })
      .then(() => {
        setDeptForm({ name: '', description: '' });
        loadDepartments();
      })
      .catch((err) => {
        setDeptError(err.response?.data?.message || 'Failed to create department.');
      })
      .finally(() => setDeptSubmitting(false));
  };

  const handleCreateCourse = (e) => {
    e.preventDefault();
    setCourseError('');
    if (!courseForm.name?.trim()) {
      setCourseError('Course name is required.');
      return;
    }
    setCourseSubmitting(true);
    api
      .post('/courses', { name: courseForm.name.trim() })
      .then(() => {
        setCourseForm({ name: '' });
        loadCourses();
      })
      .catch((err) => {
        setCourseError(err.response?.data?.message || 'Failed to create course.');
      })
      .finally(() => setCourseSubmitting(false));
  };

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');
    if (!userForm.email?.trim() || !userForm.password || !userForm.full_name?.trim()) {
      setUserError('Email, password and full name are required.');
      return;
    }
    if (userForm.role === 'dept_admin' && !userForm.department_id) {
      setUserError('Department is required for Department Admin.');
      return;
    }
    if (userForm.role === 'lecturer' && !userForm.course_id) {
      setUserError('Course is required for Lecturer. Students in this course will see their restricted sessions.');
      return;
    }
    setUserSubmitting(true);
    api
      .post('/admin/users', {
        email: userForm.email.trim(),
        password: userForm.password,
        full_name: userForm.full_name.trim(),
        role: userForm.role,
        department_id: userForm.role === 'dept_admin' ? userForm.department_id : undefined,
        course_id: userForm.role === 'lecturer' ? userForm.course_id : undefined,
      })
      .then(() => {
        setUserSuccess('Admin/lecturer created successfully. They can log in with the email and password you set.');
        setUserForm({ email: '', password: '', full_name: '', role: 'dept_admin', department_id: '', course_id: '' });
      })
      .catch((err) => {
        setUserError(err.response?.data?.message || 'Failed to create user.');
      })
      .finally(() => setUserSubmitting(false));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-10"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-2">Platform</h1>
        <p className="text-text-secondary">Manage departments, courses, and assign admins or lecturers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Courses / Programmes</CardTitle>
          <CardDescription>
            Courses offered by the school. Students choose one when registering. Used for restricted session visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {coursesLoading ? (
            <p className="text-text-secondary">Loading courses...</p>
          ) : (
            <ul className="space-y-2">
              {courses.length === 0 ? (
                <li className="text-text-secondary">No courses yet. Add one below.</li>
              ) : (
                courses.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-text-primary">
                    <span className="font-medium">{c.name}</span>
                  </li>
                ))
              )}
            </ul>
          )}
          <form onSubmit={handleCreateCourse} className="flex flex-wrap items-end gap-4 pt-4 border-t border-border">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-text-primary mb-1.5">New course name</label>
              <Input
                placeholder="e.g. Mechanical Engineering"
                value={courseForm.name}
                onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={courseSubmitting}>
              {courseSubmitting ? 'Adding...' : 'Add course'}
            </Button>
          </form>
          {courseError && <p className="text-sm text-danger">{courseError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Create new departments. Admins are then assigned to a department.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {departmentsLoading ? (
            <p className="text-text-secondary">Loading departments...</p>
          ) : (
            <ul className="space-y-2">
              {departments.length === 0 ? (
                <li className="text-text-secondary">No departments yet. Create one below.</li>
              ) : (
                departments.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 text-text-primary">
                    <span className="font-medium">{d.name}</span>
                    {d.description && (
                      <span className="text-text-muted text-sm">— {d.description}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
          <form onSubmit={handleCreateDepartment} className="flex flex-wrap items-end gap-4 pt-4 border-t border-border">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-text-primary mb-1.5">New department name</label>
              <Input
                placeholder="e.g. Bursary"
                value={deptForm.name}
                onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Description (optional)</label>
              <Input
                placeholder="Short description"
                value={deptForm.description}
                onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={deptSubmitting}>
              {deptSubmitting ? 'Creating...' : 'Create department'}
            </Button>
          </form>
          {deptError && <p className="text-sm text-danger">{deptError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create admin or lecturer</CardTitle>
          <CardDescription>
            Add a department admin (tied to one department) or a lecturer (for office hours). They will log in with
            the email and password you set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAdmin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="e.g. admin@unilag.edu.ng"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
              <PasswordInput
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Set a secure password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Full name</label>
              <Input
                placeholder="e.g. Dr. Jane Admin"
                value={userForm.full_name}
                onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Role</label>
              <select
                value={userForm.role}
                onChange={(e) =>
                  setUserForm((f) => ({
                    ...f,
                    role: e.target.value,
                    department_id: e.target.value === 'lecturer' ? '' : f.department_id,
                  }))
                }
                className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="dept_admin">Department admin</option>
                <option value="lecturer">Lecturer</option>
              </select>
            </div>
            {userForm.role === 'dept_admin' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Department</label>
                <select
                  value={userForm.department_id}
                  onChange={(e) => setUserForm((f) => ({ ...f, department_id: e.target.value }))}
                  className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                  disabled={departmentsLoading}
                >
                  <option value="">
                    {departmentsLoading ? 'Loading...' : departments.length === 0 ? 'No departments' : 'Select department'}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {userForm.role === 'lecturer' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Course / programme</label>
                <select
                  value={userForm.course_id}
                  onChange={(e) => setUserForm((f) => ({ ...f, course_id: e.target.value }))}
                  className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  required
                  disabled={coursesLoading}
                >
                  <option value="">
                    {coursesLoading ? 'Loading...' : courses.length === 0 ? 'No courses' : 'Select course'}
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-muted mt-1">Students in this course will see this lecturer&apos;s restricted (office hours) sessions.</p>
              </div>
            )}
            {userError && <p className="text-sm text-danger">{userError}</p>}
            {userSuccess && <p className="text-sm text-green-600 dark:text-green-400">{userSuccess}</p>}
            <Button type="submit" disabled={userSubmitting}>
              {userSubmitting ? 'Creating...' : 'Create admin / lecturer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
