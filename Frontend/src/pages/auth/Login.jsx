import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { api } from '../../services/api';

const LOGIN_TIMEOUT_MS = 15000;

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = loginId.trim();
    if (!trimmed) {
      setError('Enter your email or matric number');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    const payload = { password };
    if (trimmed.includes('@')) payload.email = trimmed;
    else payload.matric_number = trimmed;

    setSubmitting(true);
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Is the server running on the correct port?')), LOGIN_TIMEOUT_MS)
      );
      await Promise.race([login(payload), timeoutPromise]);

      const { data } = await api.get('/auth/me');
      const role = data?.data?.user?.role;
      if (role === 'student') navigate('/student', { replace: true });
      else navigate('/admin', { replace: true });
    } catch (err) {
      const message =
        err.message === 'Connection timed out. Is the server running on the correct port?'
          ? err.message
          : err.response?.data?.message || err.message || 'Login failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, var(--primary-glow), transparent 50%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              UNILAG Queue
            </CardTitle>
            <CardDescription>Sign in</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Email or matric number"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoComplete="username"
              />
              <PasswordInput
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Logging in...' : 'Log in'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-text-secondary">
              No account? <Link to="/register" className="text-primary hover:underline font-medium">Register as student</Link>
            </p>
            <p className="mt-2 text-center text-xs text-text-muted">
              Staff? Log in with your email. Students can use email or matric number.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
