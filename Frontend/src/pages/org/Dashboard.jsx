import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Building2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

export default function OrgDashboard() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/orgs')
      .then(({ data }) => {
        const orgs = data?.data?.orgs ?? [];
        if (orgs.length > 0) {
          navigate(`/org/${orgs[0].slug}`, { replace: true });
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-text-secondary mt-1 text-sm">Let's get your organization set up</p>
      </div>

      <div className="max-w-md">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">Create your organization</p>
              <p className="text-text-muted text-sm mt-1 max-w-xs">
                Set up your organization once, then create as many queues as you need inside it.
              </p>
            </div>
            <Button onClick={() => navigate('/org/new')} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Set up organization
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
