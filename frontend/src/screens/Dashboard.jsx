import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function Kpi({ label, value, hint }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-primary mt-2">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: '—', activeProducts: '—' });

  useEffect(() => {
    api.list('products', { pageSize: 1 })
      .then(({ meta }) => setStats((s) => ({ ...s, products: meta?.total ?? 0 })))
      .catch(() => {});
    api.list('products', { isActive: 'true', pageSize: 1 })
      .then(({ meta }) => setStats((s) => ({ ...s, activeProducts: meta?.total ?? 0 })))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Foundation milestone — the pipeline is live.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Products" value={stats.products} hint="Total in catalogue" />
        <Kpi label="Active Products" value={stats.activeProducts} hint="Marked active" />
        <Kpi label="Modules Online" value="Foundation" hint="M2–M7 to follow" />
        <Kpi label="System" value="Healthy" hint="Event log + audit recording" />
      </div>
    </div>
  );
}
