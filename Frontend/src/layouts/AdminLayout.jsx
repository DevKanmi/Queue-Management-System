import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, BarChart3, Building2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AppNavbar from '../components/AppNavbar';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-colors',
      isActive
        ? 'bg-primary/15 text-primary border border-primary/20'
        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary border border-transparent'
    );

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar
        right={
          <>
            <span className="text-sm text-text-secondary hidden sm:inline">
              {user?.full_name} <span className="text-text-muted">({user?.role})</span>
            </span>
            <button
              type="button"
              onClick={() => { logout(); navigate('/'); }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </>
        }
      />
      <div className="border-b border-border bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 py-2">
            <NavLink to="/admin" end className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>
            <NavLink to="/admin/analytics" className={navLinkClass}>
              <BarChart3 className="w-4 h-4" />
              Analytics
            </NavLink>
            {user?.role === 'superadmin' && (
              <NavLink to="/admin/platform" className={navLinkClass}>
                <Building2 className="w-4 h-4" />
                Platform
              </NavLink>
            )}
          </nav>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
