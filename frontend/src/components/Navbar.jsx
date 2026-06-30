import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/products', label: 'Products' }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  return (
    <header className="bg-primary text-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/"><Logo /></Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((n) => {
              const active = loc.pathname === n.to;
              return (
                <Link key={n.to} to={n.to}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    active ? 'bg-white/15' : 'text-white/80 hover:bg-white/10'}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-white/80 hidden sm:inline">{user.name}</span>}
          <button onClick={logout}
            className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
