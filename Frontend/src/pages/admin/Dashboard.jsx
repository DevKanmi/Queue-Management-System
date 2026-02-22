import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, CalendarPlus, Plus, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import StateBadge from '../../components/StateBadge';
import { api } from '../../services/api';

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
    const date = new Date(d);
    return date.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          </div>
          <p className="text-text-secondary">Manage your queue sessions.</p>
        </div>
        <Link to="/admin/sessions/new" className={cn(buttonVariants(), 'inline-flex items-center gap-2')}>
          <Plus className="w-4 h-4" />
          Create session
        </Link>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Your sessions</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 animate-pulse">
                  <div className="h-5 bg-surface-elevated rounded w-2/3 mb-2" />
                  <div className="h-4 bg-surface-elevated rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <CalendarPlus className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-text-primary">No sessions yet</h3>
              <CardDescription className="mt-1">Create a session to get started.</CardDescription>
              <Link to="/admin/sessions/new" className={cn(buttonVariants(), 'mt-4 inline-block')}>
                Create session
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link key={session.id} to={`/admin/sessions/${session.id}`}>
                <Card className="hover:border-border-strong transition-colors cursor-pointer">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-text-primary">{session.title}</h3>
                      <p className="text-sm text-text-muted mt-0.5">
                        {session.department?.name} · {formatDate(session.date)}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {session.total_enrolled} / {session.capacity} slots · {session.slot_duration} min each
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StateBadge state={session.state} />
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}
