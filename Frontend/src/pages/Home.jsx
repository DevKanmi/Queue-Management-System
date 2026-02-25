import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';
import { GraduationCap, Building2, LogIn, UserPlus, Zap } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    const dest = user.role === 'student' ? '/student' : user.role === 'organizer' ? '/org' : '/admin';
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, var(--primary-glow), transparent 55%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          background: 'radial-gradient(ellipse 40% 30% at 80% 80%, rgba(139,92,246,0.08), transparent 60%)',
        }}
      />

      {/* Navbar */}
      <header className="relative z-10 border-b border-border bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            QueueFlow
          </span>
          <Link to="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <LogIn className="w-4 h-4 mr-2" />
            Log in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-4xl mx-auto"
        >
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Zap className="w-3 h-3" />
              Smart queue management
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-primary via-accent to-violet-400 bg-clip-text text-transparent">
              Skip the wait.
            </span>
            <br />
            <span className="text-text-primary">Show up when it's your turn.</span>
          </h1>

          <p className="text-center text-lg text-text-secondary max-w-xl mx-auto mb-12">
            QueueFlow lets anyone join or manage a queue from their phone — no waiting in line, no guessing your position.
          </p>

          {/* Two-path cards */}
          <div className="grid sm:grid-cols-2 gap-5">
            {/* UNILAG Student card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="relative rounded-2xl border border-border bg-surface/60 backdrop-blur-sm p-6 flex flex-col gap-5 overflow-hidden"
            >
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99,102,241,0.08), transparent 70%)' }}
              />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">UNILAG Student</p>
                  <p className="text-xs text-text-muted">Join queues on campus</p>
                </div>
              </div>
              <ul className="relative space-y-1.5 text-sm text-text-muted">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/60" />Register with your matric number</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/60" />Join lecturer & department queues</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/60" />Track your position in real time</li>
              </ul>
              <div className="relative flex flex-col gap-2 mt-auto">
                <Link
                  to="/register"
                  className={cn(buttonVariants({ size: 'sm' }), 'w-full justify-center')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register as student
                </Link>
                <Link
                  to="/login"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full justify-center text-text-muted')}
                >
                  Already registered? Log in
                </Link>
              </div>
            </motion.div>

            {/* Organizer / Business card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.35 }}
              className="relative rounded-2xl border border-border bg-surface/60 backdrop-blur-sm p-6 flex flex-col gap-5 overflow-hidden"
            >
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ background: 'radial-gradient(ellipse 80% 60% at 80% 0%, rgba(139,92,246,0.08), transparent 70%)' }}
              />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">Business or individual</p>
                  <p className="text-xs text-text-muted">Create and manage queues</p>
                </div>
              </div>
              <ul className="relative space-y-1.5 text-sm text-text-muted">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent/60" />Barbers, clinics, offices & more</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent/60" />Share a code — customers join instantly</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-accent/60" />No app needed for your customers</li>
              </ul>
              <div className="relative flex flex-col gap-2 mt-auto">
                <Link
                  to="/register/organizer"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'w-full justify-center bg-accent hover:bg-accent/90 shadow-[0_0_20px_rgba(139,92,246,0.25)]'
                  )}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create organizer account
                </Link>
                <Link
                  to="/login"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full justify-center text-text-muted')}
                >
                  Already have an account? Log in
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-5 text-xs text-text-muted border-t border-border">
        QueueFlow · Smart queue management for everyone
      </footer>
    </div>
  );
}
