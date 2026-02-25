import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarPlus, Plus, ChevronRight, Layers, Zap, Users2 } from 'lucide-react';
import { buttonVariants } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import StateBadge from '../../components/StateBadge';
import { api } from '../../services/api';

const STATE_ORDER = { ACTIVE: 0, OPEN: 1, PAUSED: 2, DRAFT: 3, CLOSED: 4 };

const STATE_STRIP = {
  ACTIVE: 'bg-success',
  OPEN: 'bg-primary',
  PAUSED: 'bg-warning',
  DRAFT: 'bg-border',
  CLOSED: 'bg-border',
};

function StatCard({ icon: Icon, label, value, cls, iconCls, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('relative overflow-hidden rounded-2xl border p-4 sm:p-5', cls)}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0', iconCls)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted leading-snug">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/sessions')
      .then(({ data }) => setSessions(data?.data?.sessions ?? []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalEnrolled = sessions.reduce((sum, s) => sum + (s.total_enrolled || 0), 0);
  const activeCount = sessions.filter((s) => s.state === 'ACTIVE').length;
  const sorted = [...sessions].sort((a, b) => (STATE_ORDER[a.state] ?? 5) - (STATE_ORDER[b.state] ?? 5));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Manage your queue sessions.</p>
        </div>
        <Link to="/admin/sessions/new" className={cn(buttonVariants(), 'inline-flex items-center gap-2')}>
          <Plus className="w-4 h-4" />
          Create session
        </Link>
      </div>

      {/* Stat cards — only shown once data is loaded and sessions exist */}
      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          <StatCard
            icon={Layers}
            label="Total sessions"
            value={sessions.length}
            cls="border-primary/20 bg-primary/5"
            iconCls="bg-primary/10 border-primary/20 text-primary"
            delay={0.05}
          />
          <StatCard
            icon={Zap}
            label="Active now"
            value={activeCount}
            cls="border-success/20 bg-success/5"
            iconCls="bg-success/10 border-success/20 text-success"
            delay={0.1}
          />
          <StatCard
            icon={Users2}
            label="Total enrolled"
            value={totalEnrolled}
            cls="border-accent/20 bg-accent/5"
            iconCls="bg-accent/10 border-accent/20 text-accent"
            delay={0.15}
          />
        </div>
      )}

      {/* Sessions list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Your sessions</h2>
          {!loading && sessions.length > 0 && (
            <span className="text-sm text-text-muted">{sessions.length} total</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex rounded-2xl border border-border bg-surface/60 overflow-hidden animate-pulse">
                <div className="w-1 shrink-0 bg-surface-elevated" />
                <div className="flex-1 p-5 space-y-2">
                  <div className="h-4 bg-surface-elevated rounded w-1/2" />
                  <div className="h-3 bg-surface-elevated rounded w-1/3" />
                  <div className="h-1.5 bg-surface-elevated rounded-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-surface/40">
            <CalendarPlus className="w-12 h-12 text-text-muted mb-4" />
            <h3 className="text-lg font-semibold text-text-primary">No sessions yet</h3>
            <p className="text-text-muted text-sm mt-1">Create a session to get started.</p>
            <Link to="/admin/sessions/new" className={cn(buttonVariants(), 'mt-4 inline-block')}>
              Create session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((session, i) => {
              const pct = session.capacity > 0 ? Math.round((session.total_enrolled / session.capacity) * 100) : 0;
              const barColor = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success';
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link to={`/admin/sessions/${session.id}`} className="block group">
                    <div className="flex rounded-2xl border border-border bg-surface/60 backdrop-blur-sm overflow-hidden hover:border-border-strong hover:shadow-lg hover:shadow-black/10 transition-all duration-200">
                      {/* State colour strip */}
                      <div className={cn('w-1 shrink-0', STATE_STRIP[session.state] ?? 'bg-border')} />
                      {/* Content */}
                      <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-text-primary truncate">{session.title}</h3>
                            <StateBadge state={session.state} />
                          </div>
                          <p className="text-sm text-text-muted mb-3">
                            {[session.department?.name, formatDate(session.date)].filter(Boolean).join(' · ')}
                          </p>
                          <div>
                            <div className="flex justify-between text-xs text-text-muted mb-1">
                              <span>{session.total_enrolled} / {session.capacity} slots filled</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted shrink-0 group-hover:text-primary transition-colors self-center hidden sm:block" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
