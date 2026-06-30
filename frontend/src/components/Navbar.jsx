import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/rfqs', label: 'RFQs' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/orders', label: 'Orders' },
  { to: '/purchase-orders', label: 'POs' },
  { to: '/purchase-requisitions', label: 'Requisitions' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/warehouses', label: 'Warehouses' }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const link = (n) => {
    const active = loc.pathname === n.to;
    return (
      <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          active ? 'bg-white/15' : 'text-white/80 hover:bg-white/10'}`}>
        {n.label}
      </Link>
    );
  };

  return (
    <header className="bg-primary text-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/"><Logo /></Link>
          <nav className="hidden lg:flex items-center gap-1">{NAV.map(link)}</nav>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-white/80 hidden sm:inline">{user.name}</span>}
          <button onClick={logout}
            className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors">Sign out</button>
          <button onClick={() => setOpen((o) => !o)}
            className="lg:hidden text-sm px-2 py-1.5 rounded bg-white/10">Menu</button>
        </div>
      </div>
      {open && <nav className="lg:hidden px-4 pb-3 flex flex-wrap gap-1 bg-primary">{NAV.map(link)}</nav>}
    </header>
  );
}
