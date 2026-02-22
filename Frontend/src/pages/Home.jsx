import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';
import { ListOrdered, LogIn, UserPlus } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }
  if (user) {
    return (
      <Navigate
        to={user.role === 'student' ? '/student' : '/admin'}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, var(--primary-glow), transparent 50%)',
        }}
      />
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            UNILAG Queue
          </span>
          <div className="flex items-center gap-3">
            <Link to="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Log in
            </Link>
            <Link to="/register" className={cn(buttonVariants({ size: 'sm' }))}>
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <ListOrdered className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Queue Management
            </span>
            <br />
            <span className="text-text-primary">for UNILAG Campus</span>
          </h1>
          <p className="mt-4 text-lg text-text-secondary max-w-xl mx-auto">
            Join queues from your phone. Get a slot, track your position, and show up when it’s your turn — no more long waits.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className={cn(buttonVariants({ size: 'lg' }), 'min-w-[180px] inline-flex items-center gap-2')}
            >
              <UserPlus className="w-5 h-5" />
              Register as student
            </Link>
            <Link
              to="/login"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'min-w-[180px] inline-flex items-center gap-2')}
            >
              <LogIn className="w-5 h-5" />
              Log in
            </Link>
          </div>
          <p className="mt-6 text-sm text-text-muted">
            Staff or lecturer? <Link to="/login" className="text-primary hover:underline">Log in</Link> with your email.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
