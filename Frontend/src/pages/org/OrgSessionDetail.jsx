import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Copy, Check, Play, Users, Clock, Calendar,
  ExternalLink, Share2, ListOrdered,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import StateBadge from '../../components/StateBadge';
import { api } from '../../services/api';

const STATE_TRANSITIONS = {
  DRAFT: [{ label: 'Open for joining', value: 'OPEN', variant: 'default' }],
  OPEN: [
    { label: 'Start session', value: 'ACTIVE', variant: 'default' },
    { label: 'Close', value: 'CLOSED', variant: 'destructive' },
  ],
  ACTIVE: [
    { label: 'Pause', value: 'PAUSED', variant: 'secondary' },
    { label: 'End session', value: 'CLOSED', variant: 'destructive' },
  ],
  PAUSED: [{ label: 'Resume', value: 'ACTIVE', variant: 'default' }],
  CLOSED: [],
};

function StatCard({ icon: Icon, value, label, accent = 'text-primary' }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${accent}`} />
        <div>
          <p className="text-2xl font-bold text-text-primary leading-tight">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };
  return (
    <Button variant="outline" onClick={handleCopy} className={copied ? 'text-success border-success/30' : ''}>
      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
      {copied ? 'Copied!' : label}
    </Button>
  );
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const formatTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toTimeString().slice(0, 5);
};

export default function OrgSessionDetail() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stateLoading, setStateLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!slug || !id) return;
    api
      .get(`/orgs/${slug}/sessions/${id}`)
      .then(({ data }) => setSession(data?.data?.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [slug, id]);

  const handleStateChange = (newState) => {
    setError('');
    setStateLoading(true);
    api
      .patch(`/orgs/${slug}/sessions/${id}/state`, { state: newState })
      .then(load)
      .catch((err) => setError(err.response?.data?.message || 'Failed to update state'))
      .finally(() => setStateLoading(false));
  };

  const joinLink = session?.join_code ? `${window.location.origin}/q/${session.join_code}` : '';
  const fillPct = session ? Math.min(100, Math.round((session.total_enrolled / session.capacity) * 100)) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-56 bg-surface-elevated rounded-lg animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-elevated animate-pulse" />)}
        </div>
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

  const transitions = STATE_TRANSITIONS[session.state] ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Button variant="ghost" size="sm" className="mb-5 -ml-2" onClick={() => navigate(`/org/${slug}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to organization
      </Button>

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{session.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            <StateBadge state={session.state} />
            <span className="text-text-muted text-sm">{formatDate(session.date)}</span>
          </div>
        </div>
        {session.state === 'ACTIVE' && (
          <Button onClick={() => navigate(`/org/${slug}/sessions/${id}/live`)}>
            <ListOrdered className="w-4 h-4 mr-2" />
            Run live queue
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          icon={Users}
          value={`${session.total_enrolled} / ${session.capacity}`}
          label="Slots filled"
          accent="text-primary"
        />
        <StatCard
          icon={Clock}
          value={`${formatTime(session.start_time)} · ${session.slot_duration}m`}
          label="Start time & slot duration"
          accent="text-accent"
        />
        <StatCard
          icon={Calendar}
          value={session.current_serving === 0 ? '—' : `#${session.current_serving}`}
          label="Currently serving"
          accent="text-success"
        />
      </div>

      {/* Fill bar */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex justify-between text-xs text-text-muted">
            <span>{session.total_enrolled} joined</span>
            <span>{session.capacity - session.total_enrolled} slots remaining</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${fillPct >= 90 ? 'bg-danger' : fillPct >= 60 ? 'bg-warning' : 'bg-primary'}`}
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Join code / Share section */}
      {session.join_code && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="w-4 h-4 text-primary" />
              Share this queue
            </CardTitle>
            <CardDescription>Share the code or link so people can join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Big join code */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs text-text-muted mb-1">Join code</p>
                <p className="font-mono text-3xl font-bold tracking-[0.2em] text-primary">{session.join_code}</p>
              </div>
              <CopyButton text={joinLink} label="Copy link" />
            </div>

            {/* URL preview */}
            <div className="flex items-center gap-2">
              <div className="flex-1 text-xs text-text-muted font-mono bg-surface-elevated px-3 py-2 rounded-lg border border-border truncate">
                {joinLink}
              </div>
              <Button variant="outline" size="sm" onClick={() => window.open(joinLink, '_blank')}>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* State controls */}
      {transitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="w-4 h-4" />
              Session controls
            </CardTitle>
            <CardDescription>
              Current state: <strong>{session.state}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {transitions.map((t) => (
              <Button
                key={t.value}
                variant={t.variant}
                onClick={() => handleStateChange(t.value)}
                disabled={stateLoading}
              >
                {t.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {session.state === 'CLOSED' && (
        <p className="text-sm text-text-muted mt-4">This session is closed. No further state changes.</p>
      )}
    </motion.div>
  );
}
