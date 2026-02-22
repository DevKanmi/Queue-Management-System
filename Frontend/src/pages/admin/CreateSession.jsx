import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../services/api';

export default function CreateSession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    department_id: '',
    date: '',
    start_time: '09:00',
    capacity: 30,
    slot_duration: 15,
    visibility: 'OPEN',
    priority_enabled: false,
  });

  const lecturerDefaultSet = useRef(false);
  useEffect(() => {
    if (user?.role === 'lecturer' && !lecturerDefaultSet.current) {
      lecturerDefaultSet.current = true;
      setForm((f) => ({ ...f, visibility: 'RESTRICTED' }));
    }
  }, [user?.role]);

  useEffect(() => {
    setDepartmentsLoading(true);
    setDepartmentsError('');
    api
      .get('/admin/departments')
      .then((res) => {
        const list = res?.data?.data?.departments ?? res?.data?.departments ?? [];
        setDepartments(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        setDepartments([]);
        setDepartmentsError(err.response?.data?.message || 'Could not load departments. Try again.');
      })
      .finally(() => setDepartmentsLoading(false));
  }, []);

  useEffect(() => {
    if (departments.length === 1 && !form.department_id) {
      setForm((f) => ({ ...f, department_id: departments[0].id }));
    }
  }, [departments, form.department_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title?.trim() || !form.department_id || !form.date || !form.start_time) {
      setError('Title, department, date and start time are required.');
      return;
    }
    setLoading(true);
    api
      .post('/admin/sessions', {
        title: form.title.trim(),
        department_id: form.department_id,
        date: form.date,
        start_time: form.start_time,
        capacity: Number(form.capacity) || 30,
        slot_duration: Number(form.slot_duration) || 15,
        visibility: form.visibility,
        priority_enabled: form.priority_enabled,
      })
      .then(({ data }) => {
        navigate(`/admin/sessions/${data.data.session.id}`);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to create session');
      })
      .finally(() => setLoading(false));
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-3xl font-bold tracking-tight text-text-primary mb-2">Create session</h1>
      <p className="text-text-secondary mb-8">Set up a new queue session.</p>

      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
          <CardDescription>Fill in the basics. You can open the session when ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Title</label>
              <Input
                placeholder="e.g. Morning Consultation"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Department</label>
              <select
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                required
                disabled={departmentsLoading}
              >
                <option value="">
                  {departmentsLoading ? 'Loading...' : departments.length === 0 ? 'No departments' : 'Select department'}
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {departmentsError && (
                <p className="text-sm text-warning mt-1">{departmentsError}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  min={today}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Start time</label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Capacity (slots)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Slot duration (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.slot_duration}
                  onChange={(e) => setForm((f) => ({ ...f, slot_duration: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-border bg-surface-elevated px-4 py-3 text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="OPEN">OPEN — visible to all students</option>
                <option value="RESTRICTED">RESTRICTED — same department/faculty only</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="priority"
                checked={form.priority_enabled}
                onChange={(e) => setForm((f) => ({ ...f, priority_enabled: e.target.checked }))}
                className="rounded border-border bg-surface-elevated text-primary focus:ring-primary/20"
              />
              <label htmlFor="priority" className="text-sm text-text-primary">
                Priority queue (e.g. Medical — urgent/emergency can move up)
              </label>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create session'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/admin')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
