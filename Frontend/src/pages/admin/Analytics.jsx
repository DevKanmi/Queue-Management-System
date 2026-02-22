import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { api } from '../../services/api';

const CHART_COLORS = ['var(--primary)', 'var(--accent)', 'var(--success)', 'var(--warning)'];

export default function Analytics() {
  const [sessionsByState, setSessionsByState] = useState([]);
  const [queueStats, setQueueStats] = useState({ totalServed: 0, totalNoShow: 0, totalWaiting: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalytics() {
      try {
        // Use admin sessions to derive simple analytics until backend has /analytics
        const { data } = await api.get('/admin/sessions').catch(() => ({ data: { data: { sessions: [] } } }));
        const sessions = data?.data?.sessions ?? [];
        const byState = (['DRAFT', 'OPEN', 'ACTIVE', 'PAUSED', 'CLOSED']).map((state) => ({
          name: state,
          count: sessions.filter((s) => s.state === state).length,
        }));
        if (!cancelled) {
          setSessionsByState(byState);
          setQueueStats({
            totalServed: sessions.reduce((a, s) => a + (s.total_enrolled ?? 0), 0),
            totalNoShow: 0,
            totalWaiting: 0,
          });
        }
      } catch (_e) {
        if (!cancelled) {
          setSessionsByState([
            { name: 'DRAFT', count: 0 },
            { name: 'OPEN', count: 0 },
            { name: 'ACTIVE', count: 0 },
            { name: 'PAUSED', count: 0 },
            { name: 'CLOSED', count: 0 },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnalytics();
    return () => { cancelled = true; };
  }, []);

  const hasAnySessions = sessionsByState.some((d) => d.count > 0);
  const pieData = sessionsByState.filter((d) => d.count > 0).length
    ? sessionsByState.map((d) => ({ name: d.name, value: d.count }))
    : [{ name: 'No data', value: 1 }];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-elevated rounded-lg animate-pulse" />
        <div className="h-64 bg-surface-elevated rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Analytics</h1>
        <p className="text-text-muted mt-1">Session and queue overview</p>
      </div>

      {!hasAnySessions && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart2 className="w-12 h-12 text-text-muted mb-4" />
            <h3 className="text-lg font-semibold text-text-primary">No session data yet</h3>
            <p className="text-sm text-text-muted mt-1">Create and run sessions to see analytics here.</p>
          </CardContent>
        </Card>
      )}

      {hasAnySessions && (
      <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total enrolled (all sessions)</CardDescription>
            <CardTitle className="text-2xl">{queueStats.totalServed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Waiting</CardDescription>
            <CardTitle className="text-2xl">{queueStats.totalWaiting}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>No-shows</CardDescription>
            <CardTitle className="text-2xl">{queueStats.totalNoShow}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions by state</CardTitle>
          <CardDescription>Count of your sessions in each state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByState} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session distribution</CardTitle>
          <CardDescription>Share of sessions by state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => (value ? `${name}: ${value}` : '')}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </motion.div>
  );
}
