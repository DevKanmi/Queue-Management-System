import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Hash, UserX, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';

export default function QueueStatus() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const showToast = useToast();
  const [session, setSession] = useState(null);
  const [myEntry, setMyEntry] = useState(null);
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/sessions/${sessionId}`).then((r) => r.data?.data?.session).catch(() => null),
      api.get(`/sessions/${sessionId}/queue/my-entry`).then((r) => r.data?.data).catch(() => null),
      api.get(`/sessions/${sessionId}/queue`).then((r) => r.data?.data).catch(() => null),
    ])
      .then(([s, entryData, state]) => {
        setSession(s);
        setMyEntry(entryData);
        setQueueState(state);
      })
      .catch(() => setError('Could not load queue status'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!sessionId || !user?.id) return;
    let s = null;
    getSocket().then((socket) => {
      if (!socket) return;
      s = socket;
      s.emit('join_session_room', { sessionId });
      s.emit('join_user_room', { userId: user.id });
      s.on('queue_update', (data) => {
        if (data?.message) showToast(data.message);
        load();
      });
      s.on('slot_assigned', () => {
        showToast('You were promoted to the queue!');
        load();
      });
      s.on('your_turn_soon', () => {
        showToast('Your turn is coming soon!');
        load();
      });
    });
    return () => {
      if (s) {
        s.off('queue_update');
        s.off('slot_assigned');
        s.off('your_turn_soon');
      }
    };
  }, [sessionId, user?.id, load, showToast]);

  const handleCancelClick = () => setShowCancelConfirm(true);
  const handleCancelConfirm = () => {
    setCancelLoading(true);
    setShowCancelConfirm(false);
    api
      .delete(`/sessions/${sessionId}/queue/cancel`)
      .then(() => {
        setMyEntry({ type: null, entry: null });
        load();
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to cancel'))
      .finally(() => setCancelLoading(false));
  };

  const fromState = location.state || {};
  const justJoined = fromState.joined || fromState.waitlist;
  const queueNumber = fromState.queueNumber;
  const waitlistPosition = fromState.position;

  if (loading && !session) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
        <Card><CardContent className="p-6 animate-pulse h-40" /></Card>
      </div>
    );
  }

  if (!session && !myEntry) {
    return (
      <div>
        <p className="text-text-muted">Session not found or you are not in this queue.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/student')}>
          Back to sessions
        </Button>
      </div>
    );
  }

  const formatTime = (d) => (d ? new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : '—');
  const hasSlot = myEntry?.type === 'slot' && myEntry?.entry;
  const onWaitlist = myEntry?.type === 'waitlist';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/student')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to sessions
      </Button>

      {session && (
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 break-words">{session.title}</h1>
      )}
      {session?.department?.name && (
        <p className="text-text-secondary text-sm mb-6">{session.department.name}</p>
      )}

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {justJoined && hasSlot && queueNumber != null && (
        <div className="mb-6 p-4 rounded-xl bg-success/15 border border-success/30 text-success">
          You joined the queue. Your number is <strong>{queueNumber}</strong>.
        </div>
      )}
      {justJoined && onWaitlist && waitlistPosition != null && (
        <div className="mb-6 p-4 rounded-xl bg-warning/15 border border-warning/30 text-warning">
          Session is full. You are on the waitlist at position <strong>{waitlistPosition}</strong>.
        </div>
      )}

      {hasSlot && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Your queue number: {myEntry.entry.queue_number}
            </CardTitle>
            <CardDescription>
              {queueState?.position != null && queueState.position > 0 && (
                <>About {queueState.estimatedWaitMinutes ?? 0} minutes until your turn.</>
              )}
              {queueState?.position === 0 && <>You are next or being served.</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-text-secondary">
              <Clock className="w-5 h-5" />
              <span>Estimated time: {formatTime(myEntry.entry.assigned_time)}</span>
            </div>
            {queueState?.position != null && queueState.position > 0 && (
              <p className="text-sm text-text-muted">
                {queueState.position} {queueState.position === 1 ? 'person' : 'people'} ahead of you.
              </p>
            )}
            <Button variant="outline" onClick={handleCancelClick} disabled={cancelLoading} className="text-danger border-danger/30 hover:bg-danger/10">
              <UserX className="w-4 h-4 mr-2" />
              {cancelLoading ? 'Leaving...' : 'Leave queue'}
            </Button>
          </CardContent>
        </Card>
      )}

      {onWaitlist && !hasSlot && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Waitlist</CardTitle>
            <CardDescription>
              You are on the waitlist. If someone does not show up, you will be promoted and notified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-secondary mb-4">
              Position: <strong>{myEntry.position ?? '—'}</strong>
            </p>
            <Button variant="outline" onClick={handleCancelClick} disabled={cancelLoading} className="text-danger border-danger/30 hover:bg-danger/10">
              <UserX className="w-4 h-4 mr-2" />
              {cancelLoading ? 'Leaving...' : 'Leave waitlist'}
            </Button>
          </CardContent>
        </Card>
      )}

      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !cancelLoading && setShowCancelConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-queue-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl p-6"
          >
            <button
              type="button"
              onClick={() => !cancelLoading && setShowCancelConfirm(false)}
              disabled={cancelLoading}
              className="absolute right-4 top-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="leave-queue-modal-title" className="text-xl font-semibold text-text-primary pr-10">
              Leave queue?
            </h2>
            <p className="mt-2 text-text-secondary">
              You will lose your slot or waitlist position. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowCancelConfirm(false)} disabled={cancelLoading}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleCancelConfirm} disabled={cancelLoading} className="text-danger border-danger/30 hover:bg-danger/10">
                {cancelLoading ? 'Leaving...' : 'Leave queue'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {myEntry?.type === null && !loading && (
        <Card>
          <CardContent className="p-6 text-center text-text-muted">
            You are not in this queue. <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/student')}>Back to sessions</Button> to join.
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
