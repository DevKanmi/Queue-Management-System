import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Building2, CalendarDays, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

const gradients = [
  'from-indigo-500/20 to-violet-500/10',
  'from-violet-500/20 to-fuchsia-500/10',
  'from-blue-500/20 to-indigo-500/10',
  'from-emerald-500/20 to-teal-500/10',
];

export default function OrgDashboard() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/orgs')
      .then(({ data }) => setOrgs(data?.data?.orgs ?? []))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-56 bg-surface-elevated rounded-lg animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-surface-elevated animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Manage your organizations and queues</p>
        </div>
        <Button onClick={() => navigate('/org/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New org
        </Button>
      </div>

      {orgs.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-text-primary">No organizations yet</p>
                <p className="text-text-muted text-sm mt-1 max-w-xs">
                  Create your first organization to start managing queues for your customers
                </p>
              </div>
              <Button onClick={() => navigate('/org/new')} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create organization
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org, i) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden group"
                onClick={() => navigate(`/org/${org.slug}`)}
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${gradients[i % gradients.length]}`} />
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <p className="font-semibold text-text-primary truncate">{org.name}</p>
                      </div>
                      {org.description && (
                        <p className="text-xs text-text-muted mt-1 line-clamp-2 pl-10">{org.description}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted shrink-0 group-hover:text-primary transition-colors mt-1" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-4 pl-10">
                    <CalendarDays className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-xs text-text-muted">
                      {org._count?.sessions ?? 0} {org._count?.sessions === 1 ? 'queue' : 'queues'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Create new card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: orgs.length * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:border-primary/30 transition-all duration-200 hover:-translate-y-0.5 border-dashed"
              onClick={() => navigate('/org/new')}
            >
              <CardContent className="pt-5 pb-5 flex flex-col items-center justify-center h-full min-h-[120px] gap-2 text-center">
                <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                  <Plus className="w-4 h-4 text-text-muted" />
                </div>
                <p className="text-sm text-text-muted font-medium">New organization</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
