import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, Zap, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../services/api';

function StatPill({ icon: Icon, value, label, accent }) {
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-4 rounded-2xl bg-surface-elevated border border-border">
      <Icon className={`w-5 h-5 mb-0.5 ${accent}`} />
      <span className="text-2xl font-bold text-text-primary leading-none">{value}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}

function FillBar({ enrolled, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
  const color = pct >= 90 ? 'bg-danger' : pct >= 60 ? 'bg-warning' : 'bg-success';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-text-muted">
        <span>{enrolled} joined</span>
        <span>{capacity - enrolled} slots left</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function PublicJoin() {
  const { joinCode } = useParams();
  const navigate = useNavigate();
  const [queueInfo, setQueueInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!joinCode) return;
    api
      .get(`/public/q/${joinCode.toUpperCase()}`)
      .then(({ data }) => setQueueInfo(data?.data?.session))
      .catch(() => setQueueInfo(null))
      .finally(() => setLoading(false));
  }, [joinCode]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!email.trim()) { setError('Email address is required'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/public/q/${joinCode.toUpperCase()}/join`, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      const { guest_token } = data.data;
      // Save to sessionStorage as a fallback; the token is also embedded in the URL
      sessionStorage.setItem(`guest_token_${joinCode.toUpperCase()}`, guest_token);
      navigate(`/q/${joinCode.toUpperCase()}/status?token=${guest_token}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join queue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-text-muted text-sm">Loading queue...</p>
        </div>
      </div>
    );
  }

  if (!queueInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 mb-4">
            <XCircle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">Queue not found</h2>
          <p className="text-text-muted text-sm">This join code is invalid or has expired.</p>
        </motion.div>
      </div>
    );
  }

  const canJoin = queueInfo.state === 'OPEN' || queueInfo.state === 'ACTIVE';
  const isFull = queueInfo.total_enrolled >= queueInfo.capacity;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% -10%, var(--primary-glow), transparent 60%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md space-y-4"
      >
        {/* Header card */}
        <div className="text-center mb-2">
          {queueInfo.organization && (
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">
              {queueInfo.organization.name}
            </p>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{queueInfo.title}</h1>
          <div className="mt-2 flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                queueInfo.state === 'ACTIVE'
                  ? 'bg-primary/15 text-primary border-primary/20 animate-pulse'
                  : queueInfo.state === 'OPEN'
                  ? 'bg-success/15 text-success border-success/20'
                  : 'bg-surface-elevated text-text-muted border-border'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                queueInfo.state === 'ACTIVE' ? 'bg-primary' : queueInfo.state === 'OPEN' ? 'bg-success' : 'bg-text-muted'
              }`} />
              {queueInfo.state === 'OPEN' ? 'Open for joining'
                : queueInfo.state === 'ACTIVE' ? 'Session in progress'
                : queueInfo.state === 'PAUSED' ? 'Paused'
                : queueInfo.state === 'CLOSED' ? 'Closed'
                : queueInfo.state}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill icon={Users} value={queueInfo.waiting_count} label="Waiting" accent="text-primary" />
          <StatPill icon={Clock} value={`${queueInfo.estimated_wait_minutes}m`} label="Est. wait" accent="text-accent" />
          <StatPill icon={Zap} value={queueInfo.capacity - queueInfo.total_enrolled} label="Slots left" accent="text-success" />
        </div>

        {/* Fill bar */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <FillBar enrolled={queueInfo.total_enrolled} capacity={queueInfo.capacity} />
          </CardContent>
        </Card>

        {/* Join form or closed state */}
        <AnimatePresence mode="wait">
          {canJoin && !isFull ? (
            <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="border-border/60">
                <CardContent className="pt-5 pb-5 space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Join this queue</h2>
                    <p className="text-xs text-text-muted mt-0.5">Enter your details to get a spot</p>
                  </div>
                  <form onSubmit={handleJoin} className="space-y-3">
                    <Input placeholder="Your name *" value={name} onChange={(e) => setName(e.target.value)} required />
                    <Input type="tel" placeholder="Phone number *" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    <Input type="email" placeholder="Email address *" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <p className="text-xs text-text-muted">We'll email your queue ticket and remind you when it's nearly your turn.</p>
                    {error && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-danger flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 shrink-0" /> {error}
                      </motion.p>
                    )}
                    <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Joining...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Join queue
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="closed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="py-8 text-center">
                  <XCircle className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary font-medium">
                    {isFull ? 'This queue is full' : 'Not accepting entries right now'}
                  </p>
                  <p className="text-text-muted text-sm mt-1">Check back later or contact the organizer.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-text-muted">
          Code: <span className="font-mono text-text-secondary">{joinCode?.toUpperCase()}</span>
        </p>
      </motion.div>
    </div>
  );
}
