import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, UserCheck, UserX, Users, CheckCircle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';

export default function LiveSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [priorityLoadingId, setPriorityLoadingId] = useState(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/admin/sessions/${id}`)
      .then(({ data }) => setSession(data?.data?.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    api
      .get(`/admin/sessions/${id}/queue`)
      .then(({ data }) => {
        setEntries(data?.data?.entries ?? []);
      })
      .catch(() => setEntries([]));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!id) return;
    let s = null;
    getSocket().then((socket) => {
      if (!socket) return;
      s = socket;
      s.emit('join_session_room', { sessionId: id });
      s.on('queue_update', load);
    });
    return () => {
      if (s) s.off('queue_update', load);
    };
  }, [id, load]);

  const handleCallNext = () => {
    setError('');
    setActionLoading(true);
    api
      .post(`/admin/sessions/${id}/queue/next`)
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to call next'))
      .finally(() => setActionLoading(false));
  };

  const handleMarkDone = () => {
    setError('');
    setActionLoading(true);
    api
      .post(`/admin/sessions/${id}/queue/complete`)
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to mark as done'))
      .finally(() => setActionLoading(false));
  };

  const handleSkip = (queueNumber) => {
    if (!window.confirm(`Skip queue number ${queueNumber}? They will be marked as no-show.`)) return;
    setError('');
    setActionLoading(true);
    api
      .post(`/admin/sessions/${id}/queue/skip`, { queue_number: queueNumber })
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to skip'))
      .finally(() => setActionLoading(false));
  };

  const handlePriorityChange = (entryId, priorityLevel) => {
    setError('');
    setPriorityLoadingId(entryId);
    api
      .patch(`/admin/sessions/${id}/queue/entries/${entryId}/priority`, { priority_level: priorityLevel })
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to set priority'))
      .finally(() => setPriorityLoadingId(null));
  };

  const currentServing = session?.current_serving ?? 0;
  const waiting = entries.filter((e) => e.status === 'waiting' && e.queue_number > currentServing);
  const servingEntry = entries.find((e) => e.status === 'serving');
  const canCallNext = waiting.length > 0;
  const canMarkDone = !!servingEntry;
  const activeEntries = entries.filter((e) => e.status !== 'cancelled' && e.status !== 'no_show');
  const allEntriesSorted = [...entries].sort((a, b) => (a.queue_number ?? 9999) - (b.queue_number ?? 9999));

  if (loading && !session) {
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

  if (session.state !== 'ACTIVE') {
    return (
      <div>
        <p className="text-text-muted">Session must be ACTIVE to run the live queue. Current state: {session.state}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/admin/sessions/${id}`)}>
          Back to session
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate(`/admin/sessions/${id}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to session
      </Button>

      <h1 className="text-2xl font-bold text-text-primary mb-1">{session.title}</h1>
      <p className="text-text-secondary text-sm mb-6">{session.department?.name}</p>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Now serving: {currentServing === 0 ? '—' : `#${currentServing}`}
          </CardTitle>
          <CardDescription>
            {waiting.length} {waiting.length === 1 ? 'person' : 'people'} waiting.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleCallNext} disabled={!canCallNext || actionLoading}>
            <UserCheck className="w-4 h-4 mr-2" />
            {actionLoading ? '...' : 'Call next'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleMarkDone}
            disabled={!canMarkDone || actionLoading}
            title={canMarkDone ? `Mark #${servingEntry?.queue_number} as done` : 'No one is currently being served'}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {actionLoading ? '...' : 'Mark as done'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>Waiting and serving. Use Skip if someone does not show up.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-text-muted">No one in the queue yet.</p>
          ) : (
            <ul className="space-y-2">
              {activeEntries
                .sort((a, b) => a.queue_number - b.queue_number)
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-surface-elevated border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-primary">#{entry.queue_number}</span>
                      <span className="text-text-primary">{entry.student?.full_name ?? '—'}</span>
                      {entry.student?.matric_number && (
                        <span className="text-text-muted text-sm">{entry.student.matric_number}</span>
                      )}
                      <span
                        className={
                          entry.priority_level === 'emergency'
                            ? 'text-xs font-medium text-red-600'
                            : entry.priority_level === 'urgent'
                              ? 'text-xs font-medium text-amber-600'
                              : 'text-xs text-text-muted'
                        }
                        title={
                          entry.priority_level === 'emergency'
                            ? 'Emergency priority'
                            : entry.priority_level === 'urgent'
                              ? 'Urgent priority'
                              : 'Routine'
                        }
                      >
                        {entry.priority_level === 'emergency'
                          ? 'Emergency'
                          : entry.priority_level === 'urgent'
                            ? 'Urgent'
                            : 'Routine'}
                      </span>
                      <span className="text-xs text-text-muted capitalize">{entry.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {session?.priority_enabled && (entry.status === 'waiting' || entry.status === 'serving') && (
                        <select
                          value={entry.priority_level || 'routine'}
                          onChange={(e) => handlePriorityChange(entry.id, e.target.value)}
                          disabled={priorityLoadingId === entry.id}
                          className="text-xs rounded-md border border-border bg-surface px-2 py-1.5 text-text-primary"
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      )}
                      {(entry.status === 'waiting' || entry.status === 'serving') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSkip(entry.queue_number)}
                          disabled={actionLoading}
                          className="text-danger border-danger/30 hover:bg-danger/10"
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Skip
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}

          {entries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowFullHistory((v) => !v)}
                className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
              >
                <ClipboardList className="w-4 h-4" />
                {showFullHistory ? 'Hide' : 'Show'} full history (including no-show & cancelled)
                {showFullHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFullHistory && (
                <ul className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
                  {allEntriesSorted.map((entry) => (
                    <li
                      key={entry.id}
                      className={`flex items-center justify-between gap-2 py-2 px-3 rounded-lg text-sm ${
                        entry.status === 'cancelled' || entry.status === 'no_show'
                          ? 'bg-surface-elevated/50 text-text-muted'
                          : 'bg-surface-elevated'
                      }`}
                    >
                      <span className="font-mono">#{entry.queue_number ?? '—'}</span>
                      <span>{entry.student?.full_name ?? '—'}</span>
                      <span className="capitalize text-xs">{entry.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
