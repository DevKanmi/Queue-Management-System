import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Trash2,
  Users,
  Clock,
  Calendar,
  ListOrdered,
  ClipboardList,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import StateBadge from '../../components/StateBadge';
import { api } from '../../services/api';

const VALID_NEXT = {
  DRAFT: [{ state: 'OPEN', label: 'Open session', icon: Play }],
  OPEN: [
    { state: 'ACTIVE', label: 'Start serving', icon: Play },
    { state: 'CLOSED', label: 'Close without starting', icon: Square },
  ],
  ACTIVE: [
    { state: 'PAUSED', label: 'Pause', icon: Pause },
    { state: 'CLOSED', label: 'End session', icon: Square },
  ],
  PAUSED: [{ state: 'ACTIVE', label: 'Resume', icon: Play }],
  CLOSED: [],
};

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(`/admin/sessions/${id}`).then(({ data }) => data?.data?.session).catch(() => null),
      api.get(`/admin/sessions/${id}/queue`).then(({ data }) => data?.data?.entries ?? []).catch(() => []),
    ])
      .then(([sess, ent]) => {
        setSession(sess);
        setEntries(Array.isArray(ent) ? ent : []);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const transition = (newState) => {
    setError('');
    setActionLoading(true);
    api
      .patch(`/admin/sessions/${id}/state`, { state: newState })
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Action failed'))
      .finally(() => setActionLoading(false));
  };

  const deleteSession = () => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    setActionLoading(true);
    api
      .delete(`/admin/sessions/${id}`)
      .then(() => navigate('/admin'))
      .catch((err) => {
        setError(err.response?.data?.message || 'Delete failed');
        setActionLoading(false);
      });
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toTimeString().slice(0, 5);
  };
  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const byStatus = (status) => entries.filter((e) => e.status === status).length;
  const completedCount = byStatus('completed');
  const noShowCount = byStatus('no_show');
  const cancelledCount = byStatus('cancelled');
  const waitingCount = byStatus('waiting');
  const servingCount = byStatus('serving');
  const totalJoined = entries.length;
  const sortedEntries = [...entries].sort((a, b) => (a.queue_number ?? 9999) - (b.queue_number ?? 9999));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
        <Card><CardContent className="p-6 animate-pulse h-40" /></Card>
      </div>
    );
  }
  if (!session) {
    return (
      <div>
        <p className="text-text-muted">Session not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/admin')}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const nextActions = VALID_NEXT[session.state] ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/admin')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to dashboard
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{session.title}</h1>
          <p className="text-text-secondary mt-1">{session.department?.name}</p>
          <div className="flex items-center gap-3 mt-3">
            <StateBadge state={session.state} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-text-primary">{session.total_enrolled} / {session.capacity}</p>
              <p className="text-xs text-text-muted">Slots filled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold text-text-primary">{formatDate(session.date)}</p>
              <p className="text-xs text-text-muted">Date</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold text-text-primary">{formatTime(session.start_time)} · {session.slot_duration} min/slot</p>
              <p className="text-xs text-text-muted">Time & duration</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {session.state === 'ACTIVE' && (
        <Card className="mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-text-primary font-medium">Run the queue live — call next, skip no-shows.</p>
            <Button onClick={() => navigate(`/admin/sessions/${id}/live`)}>
              <ListOrdered className="w-4 h-4 mr-2" />
              Run live session
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Attendance & audit
          </CardTitle>
          <CardDescription>
            Everyone who joined this session and their outcome. Use for records or audit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalJoined === 0 ? (
            <p className="text-text-muted">No one has joined this session yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-4">
                <span className="text-sm text-text-muted">
                  <strong className="text-text-primary">{totalJoined}</strong> total joined
                </span>
                {completedCount > 0 && (
                  <span className="text-sm flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <strong className="text-text-primary">{completedCount}</strong> completed
                  </span>
                )}
                {waitingCount > 0 && (
                  <span className="text-sm text-text-muted">
                    <strong className="text-text-primary">{waitingCount}</strong> waiting
                  </span>
                )}
                {servingCount > 0 && (
                  <span className="text-sm text-text-muted">
                    <strong className="text-text-primary">{servingCount}</strong> serving
                  </span>
                )}
                {noShowCount > 0 && (
                  <span className="text-sm flex items-center gap-1">
                    <UserX className="w-4 h-4 text-amber-600" />
                    <strong className="text-text-primary">{noShowCount}</strong> no-show
                  </span>
                )}
                {cancelledCount > 0 && (
                  <span className="text-sm flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-text-muted" />
                    <strong className="text-text-primary">{cancelledCount}</strong> cancelled
                  </span>
                )}
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-elevated border-b border-border">
                      <th className="text-left p-3 font-medium text-text-primary">#</th>
                      <th className="text-left p-3 font-medium text-text-primary">Name</th>
                      <th className="text-left p-3 font-medium text-text-primary">Matric</th>
                      <th className="text-left p-3 font-medium text-text-primary hidden sm:table-cell">Email</th>
                      <th className="text-left p-3 font-medium text-text-primary">Status</th>
                      <th className="text-left p-3 font-medium text-text-primary hidden md:table-cell">Assigned time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-surface-elevated/50">
                        <td className="p-3 font-mono text-text-primary">{entry.queue_number ?? '—'}</td>
                        <td className="p-3 text-text-primary">{entry.student?.full_name ?? '—'}</td>
                        <td className="p-3 text-text-muted">{entry.student?.matric_number ?? '—'}</td>
                        <td className="p-3 text-text-muted hidden sm:table-cell">{entry.student?.email ?? '—'}</td>
                        <td className="p-3">
                          <span
                            className={
                              entry.status === 'completed'
                                ? 'text-green-600'
                                : entry.status === 'no_show'
                                  ? 'text-amber-600'
                                  : entry.status === 'cancelled'
                                    ? 'text-text-muted'
                                    : 'text-text-primary'
                            }
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-3 text-text-muted hidden md:table-cell">
                          {formatDateTime(entry.assigned_time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Change session state. Invalid transitions are rejected.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {nextActions.map(({ state, label, icon: Icon }) => (
            <Button
              key={state}
              onClick={() => transition(state)}
              disabled={actionLoading}
              variant={state === 'CLOSED' ? 'destructive' : 'default'}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Button>
          ))}
          {session.state === 'DRAFT' && (
            <Button variant="destructive" onClick={deleteSession} disabled={actionLoading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete session
            </Button>
          )}
          {nextActions.length === 0 && session.state !== 'DRAFT' && (
            <p className="text-sm text-text-muted">No further state changes. Session is {session.state}.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
