import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, CheckCircle2, XCircle, Ticket, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';

function PositionDots({ ahead, max = 10 }) {
  const dots = Math.min(ahead, max);
  const extra = ahead > max ? ahead - max : 0;
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {Array.from({ length: dots }).map((_, i) => (
        <div key={i} className="w-2.5 h-2.5 rounded-full bg-text-muted/40 border border-border" />
      ))}
      <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary/40 shadow-[0_0_6px_var(--primary)]" />
      {extra > 0 && <span className="text-xs text-text-muted ml-1">+{extra} more</span>}
    </div>
  );
}

export default function PublicStatus() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  // Token resolution order: URL param → sessionStorage (fallback for older links)
  const tokenFromUrl = searchParams.get('token');
  const tokenFromStorage = joinCode ? sessionStorage.getItem(`guest_token_${joinCode.toUpperCase()}`) : null;
  const guestToken = tokenFromUrl || tokenFromStorage;

  // Persist URL token to sessionStorage so subsequent navigations without the param still work
  useEffect(() => {
    if (tokenFromUrl && joinCode) {
      sessionStorage.setItem(`guest_token_${joinCode.toUpperCase()}`, tokenFromUrl);
    }
  }, [tokenFromUrl, joinCode]);

  const load = useCallback(() => {
    if (!joinCode || !guestToken) return;
    api
      .get(`/public/q/${joinCode.toUpperCase()}/status/${guestToken}`)
      .then(({ data }) => setStatus(data?.data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [joinCode, guestToken]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!status?.queue_number) return;
    let s = null;
    getSocket().then((socket) => {
      if (!socket) return;
      s = socket;
      if (status?.session_id) s.emit('join_session_room', { sessionId: status.session_id });
      s.on('queue_update', load);
    });
    return () => { if (s) s.off('queue_update', load); };
  }, [load, status?.queue_number, status?.session_id]);

  const handleCancel = async () => {
    if (!window.confirm('Leave this queue? This cannot be undone.')) return;
    setCancelling(true);
    setError('');
    try {
      await api.delete(`/public/q/${joinCode.toUpperCase()}/cancel/${guestToken}`);
      sessionStorage.removeItem(`guest_token_${joinCode.toUpperCase()}`);
      navigate(`/q/${joinCode.toUpperCase()}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave queue');
    } finally {
      setCancelling(false);
    }
  };

  if (!guestToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm w-full">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning/10 border border-warning/20 mb-4">
            <Ticket className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">No ticket found</h2>
          <p className="text-text-muted text-sm mb-6">Use the link from your confirmation email to get back to your position, or join again below.</p>
          <Button onClick={() => navigate(`/q/${joinCode}`)}>
            Join again <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Loading your position...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm w-full">
          <p className="text-text-secondary mb-4">Could not load your queue status.</p>
          <Button onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </motion.div>
      </div>
    );
  }

  const isWaiting = status.status === 'waiting';
  const isServing = status.status === 'serving';
  const isDone = status.status === 'completed';
  const isCancelled = status.status === 'cancelled' || status.status === 'no_show';
  const isActive = isWaiting || isServing;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isServing
            ? 'radial-gradient(ellipse 70% 40% at 50% -10%, rgba(16,185,129,0.2), transparent 60%)'
            : 'radial-gradient(ellipse 70% 40% at 50% -10%, var(--primary-glow), transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm space-y-4"
      >
        {/* Session title */}
        <div className="text-center">
          <p className="text-xs font-medium text-text-muted uppercase tracking-widest">{status.session_title}</p>
        </div>

        {/* Main status card */}
        <AnimatePresence mode="wait">
          {isServing && (
            <motion.div key="serving" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-success/30 bg-success/5">
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  >
                    <div className="w-24 h-24 rounded-full bg-success/15 border-2 border-success/30 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.25)]">
                      <CheckCircle2 className="w-12 h-12 text-success" />
                    </div>
                  </motion.div>
                  <div>
                    <p className="text-2xl font-bold text-success">It's your turn!</p>
                    <p className="text-text-muted text-sm mt-1">Queue #{status.queue_number} — please proceed now</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {isWaiting && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-5 text-center">
                  {/* Ticket number */}
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Your number</p>
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full blur-2xl bg-primary/20 scale-150" />
                      <p className="relative text-7xl font-bold tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent leading-none py-2">
                        #{status.queue_number}
                      </p>
                    </div>
                  </div>

                  {/* Position dots */}
                  {status.position_ahead > 0 && (
                    <div className="w-full">
                      <p className="text-xs text-text-muted mb-3">
                        <span className="text-text-primary font-semibold">{status.position_ahead}</span>{' '}
                        {status.position_ahead === 1 ? 'person' : 'people'} ahead of you
                      </p>
                      <PositionDots ahead={status.position_ahead} />
                    </div>
                  )}

                  {status.position_ahead === 0 && (
                    <p className="text-sm font-medium text-success">You're next!</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="flex flex-col items-center p-3 rounded-xl bg-surface-elevated border border-border">
                      <Clock className="w-4 h-4 text-primary mb-1" />
                      <span className="text-lg font-bold text-text-primary">{status.estimated_wait_minutes}m</span>
                      <span className="text-xs text-text-muted">Est. wait</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-xl bg-surface-elevated border border-border">
                      <Users className="w-4 h-4 text-primary mb-1" />
                      <span className="text-lg font-bold text-text-primary">
                        {status.current_serving === 0 ? '—' : `#${status.current_serving}`}
                      </span>
                      <span className="text-xs text-text-muted">Now serving</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {isDone && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-primary/20">
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-xl font-bold text-text-primary">All done</p>
                  <p className="text-text-muted text-sm">Your session is complete. Thanks for your patience.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {isCancelled && (
            <motion.div key="cancelled" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-20 h-20 rounded-full bg-surface-elevated border border-border flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-text-muted" />
                  </div>
                  <p className="text-xl font-bold text-text-primary">
                    {status.status === 'no_show' ? 'Missed' : 'Left queue'}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/q/${joinCode}`)}>
                    Rejoin
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {error && <p className="text-sm text-danger text-center">{error}</p>}

        {isActive && (
          <Button
            variant="outline"
            className="w-full text-danger border-danger/30 hover:bg-danger/10"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />Leaving...</span>
              : 'Leave queue'}
          </Button>
        )}

        {isWaiting && (
          <p className="text-center text-xs text-text-muted">
            Updates automatically · You'll get an email when it's nearly your turn
          </p>
        )}
      </motion.div>
    </div>
  );
}
