import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Calendar, Copy, Check, Users, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import StateBadge from '../../components/StateBadge';
import { api } from '../../services/api';

function CopyButton({ text, label = 'Copy link', size = 'sm' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button variant="outline" size={size} onClick={handleCopy} className={copied ? 'text-success border-success/30' : ''}>
      {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
      {copied ? 'Copied!' : label}
    </Button>
  );
}

export default function OrgDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get(`/orgs/${slug}`),
      api.get(`/orgs/${slug}/sessions`),
    ])
      .then(([orgRes, sessRes]) => {
        setOrg(orgRes.data?.data?.org);
        setSessions(sessRes.data?.data?.sessions ?? []);
      })
      .catch(() => setOrg(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const getJoinLink = (joinCode) => `${window.location.origin}/q/${joinCode}`;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 bg-surface-elevated rounded-lg animate-pulse" />
        <div className="h-24 rounded-2xl bg-surface-elevated animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-elevated animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div>
        <p className="text-text-muted">Organization not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/org')}>Back</Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Button variant="ghost" size="sm" className="mb-5 -ml-2" onClick={() => navigate('/org')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Organizations
      </Button>

      {/* Org header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">{org.name}</h1>
          {org.description && <p className="text-text-secondary text-sm mt-1 max-w-lg">{org.description}</p>}
          <p className="text-xs text-text-muted mt-2">
            <span className="font-mono">{slug}</span>
          </p>
        </div>
        <Button onClick={() => navigate(`/org/${slug}/sessions/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          New queue
        </Button>
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">No queues yet</p>
              <p className="text-text-muted text-sm mt-1">Create a queue and share the join link with your customers</p>
            </div>
            <Button onClick={() => navigate(`/org/${slug}/sessions/new`)}>
              <Plus className="w-4 h-4 mr-2" />
              Create first queue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-widest mb-4">
            {sessions.length} {sessions.length === 1 ? 'Queue' : 'Queues'}
          </p>
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className="cursor-pointer hover:border-primary/30 transition-all duration-200 group"
                onClick={() => navigate(`/org/${slug}/sessions/${session.id}`)}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-text-primary truncate">{session.title}</span>
                        <StateBadge state={session.state} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {session.total_enrolled} / {session.capacity}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {session.slot_duration} min/slot
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {session.join_code && (
                        <>
                          <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
                            {session.join_code}
                          </span>
                          <CopyButton text={getJoinLink(session.join_code)} />
                        </>
                      )}
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
