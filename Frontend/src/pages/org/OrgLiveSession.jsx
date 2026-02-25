import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserCheck, UserX, Users, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';

const STATUS_STYLES = {
  waiting: 'text-text-primary',
  serving: 'text-primary',
  completed: 'text-text-muted line-through',
  no_show: 'text-danger',
  cancelled: 'text-text-muted',
};

export default function OrgLiveSession() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!slug || !id) return;
    setLoading(true);
    api
      .get(`/orgs/${slug}/sessions/${id}`)
      .then(({ data }) => setSession(data?.data?.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    api
      .get(`/orgs/${slug}/sessions/${id}/queue`)
      .then(({ data }) => setEntries(data?.data?.entries ?? []))
      .catch(() => setEntries([]));
  }, [slug, id]);

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
    return () => { if (s) s.off('queue_update', load); };
  }, [id, load]);

  const callNext = () => {
    setError('');
    setActionLoading(true);
    api.post(`/orgs/${slug}/sessions/${id}/queue/next`)
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to call next'))
      .finally(() => setActionLoading(false));
  };

  const markDone = () => {
    setError('');
    setActionLoading(true);
    api.post(`/orgs/${slug}/sessions/${id}/queue/complete`)
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to mark as done'))
      .finally(() => setActionLoading(false));
  };

  const skip = (queueNumber) => {
    if (!window.confirm(`Skip queue number ${queueNumber}? They will be marked as no-show.`)) return;
    setError('');
    setActionLoading(true);
    api.post(`/orgs/${slug}/sessions/${id}/queue/skip`, { queue_number: queueNumber })
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to skip'))
      .finally(() => setActionLoading(false));
  };

  const getDisplayName = (entry) => entry.guest_name || entry.student?.full_name || '—';
  const getSubtitle = (entry) => entry.guest_phone || entry.student?.matric_number || null;

  const currentServing = session?.current_serving ?? 0;
  const servingEntry = entries.find((e) => e.status === 'serving');
  const waiting = entries.filter((e) => e.status === 'waiting');
  const activeEntries = entries.filter((e) => e.status !== 'cancelled' && e.status !== 'no_show');

  if (loading && !session) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 bg-surface-elevated rounded-lg animate-pulse" />
        <Card><CardContent className="p-6 animate-pulse h-40" /></Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <p className="text-text-muted">Session not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/org/${slug}`)}>Back</Button>
      </div>
    );
  }

  if (session.state !== 'ACTIVE') {
    return (
      <div>
        <p className="text-text-muted">Session must be ACTIVE. Current state: <strong>{session.state}</strong></p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(`/org/${slug}/sessions/${id}`)}>
          Back to session
        </Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Button variant="ghost" size="sm" className="mb-5 -ml-2" onClick={() => navigate(`/org/${slug}/sessions/${id}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to session
      </Button>

      <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-6">{session.title}</h1>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {/* Now serving hero */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            {/* Big number */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-xl bg-primary/20" />
                <div className="relative w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">
                    {currentServing === 0 ? '—' : `#${currentServing}`}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Now serving</p>
                <AnimatePresence mode="wait">
                  {servingEntry ? (
                    <motion.div key={servingEntry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                      <p className="text-lg font-semibold text-text-primary">{getDisplayName(servingEntry)}</p>
                      {getSubtitle(servingEntry) && (
                        <p className="text-sm text-text-muted">{getSubtitle(servingEntry)}</p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.p key="none" className="text-text-muted">No one yet</motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={callNext} disabled={waiting.length === 0 || actionLoading}>
                <UserCheck className="w-4 h-4 mr-2" />
                {actionLoading ? '...' : 'Call next'}
                {waiting.length > 0 && !actionLoading && (
                  <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                    {waiting.length} waiting
                  </span>
                )}
              </Button>
              <Button variant="secondary" onClick={markDone} disabled={!servingEntry || actionLoading}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {actionLoading ? '...' : 'Mark done'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Queue
          </CardTitle>
          <CardDescription>
            {waiting.length} {waiting.length === 1 ? 'person' : 'people'} waiting
            {servingEntry ? ' · 1 being served' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeEntries.length === 0 ? (
            <p className="text-text-muted text-sm">No one in the queue yet.</p>
          ) : (
            <ul className="space-y-2">
              {activeEntries
                .sort((a, b) => a.queue_number - b.queue_number)
                .map((entry) => (
                  <motion.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between gap-4 py-3 px-4 rounded-xl border transition-colors ${
                      entry.status === 'serving'
                        ? 'bg-primary/5 border-primary/25'
                        : 'bg-surface-elevated border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-bold w-8 text-center ${
                          entry.status === 'serving' ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        #{entry.queue_number}
                      </span>
                      <div>
                        <p className={`font-medium ${STATUS_STYLES[entry.status] ?? 'text-text-primary'}`}>
                          {getDisplayName(entry)}
                        </p>
                        {getSubtitle(entry) && (
                          <p className="text-xs text-text-muted">{getSubtitle(entry)}</p>
                        )}
                      </div>
                      {entry.status === 'serving' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 animate-pulse">
                          Serving
                        </span>
                      )}
                    </div>

                    {(entry.status === 'waiting' || entry.status === 'serving') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => skip(entry.queue_number)}
                        disabled={actionLoading}
                        className="text-danger border-danger/30 hover:bg-danger/10 shrink-0"
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Skip
                      </Button>
                    )}
                  </motion.li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
