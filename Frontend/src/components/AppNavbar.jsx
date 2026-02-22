/**
 * Sticky navbar: logo left, optional right slot (bell, user menu).
 * h-16, bg-background/80 backdrop-blur-xl border-b border-border
 */
import { Link } from 'react-router-dom';

export default function AppNavbar({ title = 'UNILAG Queue', right }) {
  return (
    <header
      className="sticky top-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        >
          {title}
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
