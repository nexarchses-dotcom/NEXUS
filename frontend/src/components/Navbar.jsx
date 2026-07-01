import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const GROUPS = [
  { label: 'Trading', items: [
    { to: '/products', label: 'Products' },
    { to: '/rfqs', label: 'RFQs' },
    { to: '/quotes', label: 'Quotes' },
    { to: '/orders', label: 'Orders' },
    { to: '/purchase-orders', label: 'Purchase Orders' },
    { to: '/purchase-requisitions', label: 'Requisitions' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/warehouses', label: 'Warehouses' }
  ]},
  { label: 'Finance', items: [
    { to: '/chart-of-accounts', label: 'Chart of Accounts' },
    { to: '/journal-entries', label: 'Journal Entries' },
    { to: '/invoices', label: 'Invoices' },
    { to: '/payments', label: 'Payments' },
    { to: '/tax-codes', label: 'Tax Codes' },
    { to: '/budgets', label: 'Budgets' },
    { to: '/reports', label: 'Reports' }
  ]},
  { label: 'HR & Payroll', items: [
    { to: '/employees', label: 'Employees' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/leave-types', label: 'Leave Types' },
    { to: '/leave-balances', label: 'Leave Balances' },
    { to: '/leave-requests', label: 'Leave Requests' },
    { to: '/performance-reviews', label: 'Performance Reviews' },
    { to: '/training-certifications', label: 'Training & Certs' },
    { to: '/salary-structures', label: 'Salary Structures' },
    { to: '/payroll-runs', label: 'Payroll Runs' }
  ]},
  { label: 'Operations', items: [
    { to: '/work-orders', label: 'Work Orders' },
    { to: '/assets', label: 'Assets' },
    { to: '/maintenance-records', label: 'Maintenance' },
    { to: '/quality-inspections', label: 'Quality Inspections' },
    { to: '/stock-transfers', label: 'Stock Transfers' },
    { to: '/shipments', label: 'Shipments' }
  ]},
  { label: 'Sales & CRM', items: [
    { to: '/contacts', label: 'Contacts' },
    { to: '/sales-pipeline', label: 'Sales Pipeline' },
    { to: '/campaigns', label: 'Campaigns' },
    { to: '/communication-log', label: 'Communication Log' },
    { to: '/vendors', label: 'Vendors' },
    { to: '/vendor-ratings', label: 'Vendor Ratings' },
    { to: '/vendor-contracts', label: 'Vendor Contracts' }
  ]},
  { label: 'Projects & More', items: [
    { to: '/projects', label: 'Projects' },
    { to: '/contracts', label: 'Contracts' },
    { to: '/contract-obligations', label: 'Contract Obligations' },
    { to: '/documents', label: 'Documents' },
    { to: '/risk-register', label: 'Risk Register' },
    { to: '/compliance-items', label: 'Compliance' },
    { to: '/support-tickets', label: 'Support Tickets' },
    { to: '/knowledge-base', label: 'Knowledge Base' }
  ]},
  { label: 'Platform', items: [
    { to: '/event-log', label: 'Event Log' },
    { to: '/alarms', label: 'Alarms' },
    { to: '/alarm-rules', label: 'Alarm Rules' },
    { to: '/automation-rules', label: 'Automation Rules' },
    { to: '/notification-templates', label: 'Notification Templates' },
    { to: '/chatbot-faq', label: 'Chatbot FAQ' },
    { to: '/webhooks', label: 'Webhooks' },
    { to: '/connectors', label: 'API Connectors' },
    { to: '/entities', label: 'Entities' }
  ]}
];

function Dropdown({ group, loc, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);
  const active = group.items.some((i) => i.to === loc.pathname);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          active ? 'bg-white/15' : 'text-white/80 hover:bg-white/10'}`}>
        {group.label} ▾
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
          {group.items.map((i) => (
            <Link key={i.to} to={i.to} onClick={() => { setOpen(false); onNavigate && onNavigate(); }}
              className={`block px-4 py-2 text-sm hover:bg-primary-soft ${
                loc.pathname === i.to ? 'text-primary font-medium' : 'text-gray-700'}`}>
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [mobile, setMobile] = useState(false);

  return (
    <header className="bg-primary text-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={`px-3 py-1.5 rounded text-sm font-medium ${
              loc.pathname === '/' ? 'bg-white/15' : 'text-white/80 hover:bg-white/10'}`}>Dashboard</Link>
            {GROUPS.map((g) => <Dropdown key={g.label} group={g} loc={loc} />)}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-white/80 hidden sm:inline">{user.name}</span>}
          <button onClick={logout}
            className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors">Sign out</button>
          <button onClick={() => setMobile((o) => !o)} className="md:hidden text-sm px-2 py-1.5 rounded bg-white/10">Menu</button>
        </div>
      </div>
      {mobile && (
        <nav className="md:hidden px-4 pb-3 bg-primary">
          <Link to="/" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm text-white/90">Dashboard</Link>
          {GROUPS.map((g) => (
            <div key={g.label} className="py-1">
              <p className="px-3 text-xs uppercase tracking-wide text-white/50">{g.label}</p>
              {g.items.map((i) => (
                <Link key={i.to} to={i.to} onClick={() => setMobile(false)}
                  className="block px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 rounded">{i.label}</Link>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
