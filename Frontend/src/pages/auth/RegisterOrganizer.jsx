import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { api } from '../../services/api';

export default function RegisterOrganizer() {
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!full_name.trim() || !email.trim() || !password) {
      setError('Full name, email and password are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      await api.post('/auth/register/organizer', {
        full_name: full_name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-success text-lg font-medium">Registration successful.</p>
          <p className="text-text-muted text-sm mt-1">Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

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
              QueueFlow
            </CardTitle>
            <CardDescription>Create an organizer account — for businesses, clinics, barbers, and anyone who manages a queue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Full name *" value={full_name} onChange={(e) => setFullName(e.target.value)} required />
              <Input type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <PasswordInput placeholder="Password (8+ chars) *" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Input type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full">Create account</Button>
            </form>
            <p className="mt-6 text-center text-sm text-text-secondary">
              Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Log in</Link>
            </p>
            <p className="mt-2 text-center text-xs text-text-muted">
              UNILAG student?{' '}
              <Link to="/register" className="text-primary hover:underline">Register here</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
