import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

const selectClass = cn(
  'flex w-full min-h-[44px] rounded-xl border border-border px-4 py-3 text-sm text-text-primary',
  'outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200',
  'cursor-pointer appearance-none bg-no-repeat bg-[length:1.25rem] bg-[right_1rem_center] pr-10'
);

const selectStyle = {
  backgroundColor: 'var(--surface-elevated)',
  backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
};

function Field({ label, optional, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-primary">
        {label}
        {optional && <span className="text-text-muted font-normal ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

export default function CreateOrgSession() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [slotDuration, setSlotDuration] = useState('15');
  const [visibility, setVisibility] = useState('OPEN');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !date || !startTime || !capacity || !slotDuration) {
      setError('Please fill all required fields');
      return;
    }
    if (Number(capacity) < 1 || Number(slotDuration) < 1) {
      setError('Capacity and slot duration must be at least 1');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/orgs/${slug}/sessions`, {
        title: title.trim(),
        date,
        start_time: startTime,
        capacity: Number(capacity),
        slot_duration: Number(slotDuration),
        visibility,
      });
      navigate(`/org/${slug}/sessions/${data.data.session.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create queue');
    } finally {
      setSubmitting(false);
    }
  };

  const totalMinutes = Number(capacity) * Number(slotDuration);
  const endHint = startTime && capacity && slotDuration
    ? (() => {
        const [h, m] = startTime.split(':').map(Number);
        const end = new Date(0, 0, 0, h, m + totalMinutes);
        return `~${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')} end time`;
      })()
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Button variant="ghost" size="sm" className="mb-5 -ml-2" onClick={() => navigate(`/org/${slug}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to organization
      </Button>

      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create queue</h1>
            <p className="text-text-muted text-sm">A join link will be generated automatically</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Queue title *">
                <Input
                  placeholder="e.g. Morning appointments, Walk-ins..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Date *">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </Field>
                <Field label="Start time *">
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Max slots *">
                  <Input
                    type="number"
                    placeholder="e.g. 30"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    min="1"
                    required
                  />
                </Field>
                <Field label="Minutes per slot *">
                  <Input
                    type="number"
                    placeholder="e.g. 15"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    min="1"
                    required
                  />
                </Field>
              </div>

              {endHint && (
                <p className="text-xs text-text-muted -mt-2">
                  {capacity} slots × {slotDuration} min = {totalMinutes} min · {endHint}
                </p>
              )}

              <Field label="Visibility">
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={selectClass} style={selectStyle}>
                  <option value="OPEN">Open — anyone with the code can join</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </Field>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span>
                    : 'Create queue'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate(`/org/${slug}`)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
