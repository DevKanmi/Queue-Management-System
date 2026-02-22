import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

export default function Register() {
  const [matric_number, setMatricNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [full_name, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/courses/options')
      .then(({ data }) => setCourses(data?.data?.courses ?? []))
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!matric_number?.trim() || !email?.trim() || !password || !full_name?.trim()) {
      setError('Matric number, email, password and full name are required');
      return;
    }
    if (!department?.trim()) {
      setError('Please select your course / programme');
      return;
    }
    try {
      await register({
        matric_number: matric_number.trim(),
        email: email.trim(),
        password,
        full_name: full_name.trim(),
        phone: phone.trim() || undefined,
        faculty: faculty.trim() || undefined,
        department: department.trim(),
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
              UNILAG Queue
            </CardTitle>
            <CardDescription>Student registration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Matric number *" value={matric_number} onChange={(e) => setMatricNumber(e.target.value)} required />
              <Input type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <PasswordInput placeholder="Password *" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Input placeholder="Full name *" value={full_name} onChange={(e) => setFullName(e.target.value)} required />
              <Input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="Faculty (optional)" value={faculty} onChange={(e) => setFaculty(e.target.value)} />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                disabled={coursesLoading}
                className={cn(
                  'flex w-full min-h-[44px] rounded-xl border border-border px-4 py-3 text-text-primary',
                  'outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200',
                  'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none bg-no-repeat bg-[length:1.25rem] bg-[right_1rem_center] pr-10'
                )}
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                }}
              >
                <option value="">Course / Programme *</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {coursesLoading && <p className="text-xs text-text-muted">Loading courses...</p>}
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full">Register</Button>
            </form>
            <p className="mt-6 text-center text-sm text-text-secondary">
              Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
