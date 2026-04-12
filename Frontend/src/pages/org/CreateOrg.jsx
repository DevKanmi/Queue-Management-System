import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { api } from '../../services/api';

export default function CreateOrg() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Redirect if org already exists
  useEffect(() => {
    api.get('/orgs').then(({ data }) => {
      const orgs = data?.data?.orgs ?? [];
      if (orgs.length > 0) navigate(`/org/${orgs[0].slug}`, { replace: true });
    }).catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Organization name is required'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/orgs', { name: name.trim(), description: description.trim() || undefined });
      navigate(`/org/${data.data.org.slug}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Button variant="ghost" size="sm" className="mb-5 -ml-2" onClick={() => navigate('/org')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Organizations
      </Button>

      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">New organization</h1>
            <p className="text-text-muted text-sm">Set up your space to manage queues</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Organization name *</label>
                <Input
                  placeholder="e.g. City Barbershop, Green Clinic..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {name.trim() && (
                  <p className="text-xs text-text-muted">
                    URL: <span className="font-mono text-text-secondary">
                      /org/{name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 30) || '...'}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Description <span className="text-text-muted font-normal">(optional)</span></label>
                <textarea
                  placeholder="What does this organization do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-xl border border-border px-4 py-3 text-text-primary bg-surface-elevated outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-none text-sm"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span>
                    : 'Create organization'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/org')}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
