import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarOff, X, History, ArrowRight, List, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import SessionCard from '../../components/SessionCard';
import { Button } from '../../components/ui/button';
import { api } from '../../services/api';

const ENTRY_STRIP = {
  waiting: 'bg-primary',
  serving: 'bg-success',
  done: 'bg-border',
  skipped: 'bg-danger',
  no_show: 'bg-danger',
};

const ENTRY_STATUS_CLS = {
  waiting: 'text-primary bg-primary/10 border-primary/20',
  serving: 'text-success bg-success/10 border-success/20',
  done: 'text-text-muted bg-surface-elevated border-border',
  skipped: 'text-danger bg-danger/10 border-danger/20',
  no_show: 'text-danger bg-danger/10 border-danger/20',
};

const ENTRY_STATUS_LABEL = {
  waiting: 'Waiting',
  serving: 'Serving',
  done: 'Done',
  skipped: 'Skipped',
  no_show: 'No show',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [myWaitlists, setMyWaitlists] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [sessionToJoin, setSessionToJoin] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');

  useEffect(() => {
    api
      .get('/sessions')
      .then(({ data }) => setSessions(data?.data?.sessions ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get('/sessions/my-entries')
      .then(({ data }) => {
        setMyEntries(data?.data?.entries ?? []);
        setMyWaitlists(data?.data?.waitlists ?? []);
      })
      .catch(() => {
        setMyEntries([]);
        setMyWaitlists([]);
      })
      .finally(() => setEntriesLoading(false));
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const firstName = user?.full_name?.split(' ')[0] || 'Student';

  const now = new Date();
  const upcomingEntry = myEntries.find(
    (e) => (e.status === 'waiting' || e.status === 'serving') && new Date(e.assigned_time) >= now
  );
  const upcomingSession = upcomingEntry?.session;
  const assignedTime = upcomingEntry?.assigned_time ? new Date(upcomingEntry.assigned_time) : null;

  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!assignedTime) return;
    const update = () => {
      const diff = assignedTime - new Date();
      if (diff <= 0) setCountdown('Now');
      else if (diff < 60000) setCountdown('< 1 min');
      else if (diff < 3600000) setCountdown(`${Math.floor(diff / 60000)} min`);
      else setCountdown(`${Math.floor(diff / 3600000)} h ${Math.floor((diff % 3600000) / 60000)} min`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [assignedTime]);

  const openJoinModal = (session) => {
    setJoinError('');
    setSessionToJoin(session);
  };

  const closeJoinModal = () => {
    if (!joinLoading) {
      setSessionToJoin(null);
      setJoinError('');
    }
  };

  const confirmJoin = () => {
    if (!sessionToJoin) return;
    setJoinError('');
    setJoinLoading(true);
    api
      .post(`/sessions/${sessionToJoin.id}/queue/join`, { priority_level: 'routine' })
      .then(({ data }) => {
        const d = data?.data;
        if (d?.type === 'slot') {
          navigate(`/student/queue/${sessionToJoin.id}`, { state: { joined: true, queueNumber: d.entry?.queue_number } });
        } else if (d?.type === 'waitlist') {
          navigate(`/student/queue/${sessionToJoin.id}`, { state: { waitlist: true, position: d.position } });
        } else {
          navigate(`/student/queue/${sessionToJoin.id}`);
        }
      })
      .catch((err) => {
        setJoinError(err.response?.data?.message || "We couldn't add you to the queue. Please try again.");
      })
      .finally(() => setJoinLoading(false));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Greeting */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
        {greeting()}, {firstName} 👋
      </h1>
      <p className="text-text-secondary mt-1 text-sm sm:text-base">View open sessions and join a queue.</p>

      {/* Up-next banner */}
      {upcomingEntry && upcomingSession && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent p-5"
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ background: 'radial-gradient(ellipse 80% 80% at 100% 50%, rgba(99,102,246,0.12), transparent 70%)' }}
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">Up next</p>
                <p className="font-bold text-text-primary text-lg leading-tight truncate">{upcomingSession.title}</p>
                <p className="text-sm text-text-muted">
                  #{upcomingEntry.queue_number}
                  {assignedTime ? ` · ${assignedTime.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  {upcomingSession.department?.name ? ` · ${upcomingSession.department.name}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {countdown && (
                <div className="text-right hidden sm:block">
                  <p className={cn('text-2xl font-bold leading-none', countdown === 'Now' ? 'text-success' : 'text-text-primary')}>
                    {countdown === 'Now' ? 'Now!' : countdown}
                  </p>
                  {countdown !== 'Now' && <p className="text-xs text-text-muted mt-0.5">remaining</p>}
                </div>
              )}
              <Button variant="secondary" size="sm" onClick={() => navigate(`/student/queue/${upcomingSession.id}`)}>
                View status
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Waitlist banners */}
      {myWaitlists.length > 0 && (
        <div className="mt-4 space-y-2">
          {myWaitlists.map((w) => (
            <div
              key={w.sessionId}
              className="flex rounded-xl border border-warning/30 bg-warning/8 overflow-hidden"
            >
              <div className="w-1 shrink-0 bg-warning" />
              <div className="flex-1 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary text-sm">{w.session?.title ?? 'Session'}</p>
                  <p className="text-xs text-text-muted">Waitlist position <strong>#{w.position}</strong></p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/student/queue/${w.sessionId}`)}>
                  View status
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex gap-1 p-1 rounded-xl bg-surface-elevated border border-border w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
            activeTab === 'feed'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          )}
        >
          <List className="w-4 h-4" />
          Session feed
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
            activeTab === 'history'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          )}
        >
          <History className="w-4 h-4" />
          My history
        </button>
      </div>

      {/* Session feed */}
      {activeTab === 'feed' && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Join a queue</h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface/60 rounded-2xl p-6 animate-pulse">
                  <div className="h-5 bg-surface-elevated rounded w-2/3 mb-3" />
                  <div className="h-4 bg-surface-elevated rounded w-1/2 mb-4" />
                  <div className="h-2 bg-surface-elevated rounded-full mb-4" />
                  <div className="h-10 bg-surface-elevated rounded-xl" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-surface/40 border border-border rounded-2xl">
              <CalendarOff className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-text-primary">No sessions open right now</h3>
              <p className="text-sm text-text-muted mt-1">Check back later or enable notifications to be alerted when one opens.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => {
                const inQueue = myEntries.some((e) => (e.status === 'waiting' || e.status === 'serving') && e.session?.id === session.id);
                const onWaitlist = myWaitlists.some((w) => w.sessionId === session.id);
                const alreadyIn = inQueue || onWaitlist;
                return (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onJoin={openJoinModal}
                    joinDisabled={joinLoading}
                    alreadyInQueue={alreadyIn}
                    onViewPosition={() => navigate(`/student/queue/${session.id}`)}
                  />
                );
              })}
            </div>
          )}
          {joinError && <p className="text-sm text-danger mt-4">{joinError}</p>}
        </section>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Your queues & history</h2>
          {entriesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex rounded-xl border border-border bg-surface/60 overflow-hidden animate-pulse h-16">
                  <div className="w-1 shrink-0 bg-surface-elevated" />
                  <div className="flex-1 p-4 space-y-2">
                    <div className="h-4 bg-surface-elevated rounded w-1/2" />
                    <div className="h-3 bg-surface-elevated rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : myEntries.length === 0 && myWaitlists.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface/40 p-6 text-center text-text-muted text-sm">
              You haven't joined any queues yet. Switch to <strong>Session feed</strong> to join one.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Waitlist entries */}
              {myWaitlists.map((w) => (
                <motion.div
                  key={`waitlist-${w.sessionId}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex rounded-xl border border-warning/25 bg-surface/60 overflow-hidden"
                >
                  <div className="w-1 shrink-0 bg-warning" />
                  <div className="flex-1 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-warning">#{w.position}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate">{w.session?.title ?? 'Session'}</p>
                        <p className="text-xs text-text-muted">{w.session?.department?.name ?? ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md border text-warning bg-warning/10 border-warning/20">
                        Waitlist
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/student/queue/${w.sessionId}`)}>
                        View
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Queue entries */}
              {myEntries.map((entry, i) => {
                const s = entry.session;
                const isActive = entry.status === 'waiting' || entry.status === 'serving';
                const dateStr = s?.date
                  ? new Date(s.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
                  : '';
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex rounded-xl border border-border bg-surface/60 overflow-hidden"
                  >
                    <div className={cn('w-1 shrink-0', ENTRY_STRIP[entry.status] ?? 'bg-border')} />
                    <div className="flex-1 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-text-muted">#{entry.queue_number}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{s?.title ?? 'Session'}</p>
                          <p className="text-xs text-text-muted">
                            {[s?.department?.name, dateStr].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md border', ENTRY_STATUS_CLS[entry.status] ?? 'text-text-muted bg-surface-elevated border-border')}>
                          {ENTRY_STATUS_LABEL[entry.status] ?? entry.status}
                        </span>
                        {isActive && (
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/student/queue/${s?.id}`)}>
                            View
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Join confirmation modal */}
      {sessionToJoin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeJoinModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl p-6"
          >
            <button
              type="button"
              onClick={closeJoinModal}
              disabled={joinLoading}
              className="absolute right-4 top-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="join-modal-title" className="text-xl font-semibold text-text-primary pr-10">
              Join queue
            </h2>
            <p className="mt-2 text-text-secondary">
              Join the queue for <strong>{sessionToJoin.title}</strong>?
            </p>
            {joinError && <p className="mt-4 text-sm text-danger">{joinError}</p>}
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="secondary" onClick={closeJoinModal} disabled={joinLoading}>
                Cancel
              </Button>
              <Button onClick={confirmJoin} disabled={joinLoading}>
                {joinLoading ? 'Joining...' : 'Join queue'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
