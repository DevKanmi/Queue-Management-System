import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AppNavbar from '../components/AppNavbar';
import NotificationBell from '../components/NotificationBell';
import { ToastProvider } from '../context/ToastContext';

export default function StudentLayout() {
  const { user, logout } = useAuth();

  return (
    <ToastProvider>
    <div className="min-h-screen bg-background">
      <AppNavbar
        right={
          <>
            <NotificationBell />
            <span className="text-sm text-text-secondary hidden sm:inline">{user?.full_name}</span>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </>
        }
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
    </ToastProvider>
  );
}
