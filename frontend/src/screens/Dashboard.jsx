import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function money(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }); }

function Kpi({ label, value, tone }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-3xl font-semibold mt-2 ${tone === 'alert' && Number(value) > 0 ? 'text-amber-600' : 'text-primary'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [m, setM] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.dashboardMetrics().then(({ data }) => setM(data)).catch(() => {});
    api.alerts().then(({ data }) => setAlerts((data || []).slice(0, 6))).catch(() => {});
  }, []);

  const k = m?.kpis || {};
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Live operational overview.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Active RFQs" value={k.activeRFQs ?? '—'} />
        <Kpi label="Pending Orders" value={k.pendingOrders ?? '—'} />
        <Kpi label="Delivered Revenue" value={k.deliveredRevenue != null ? money(k.deliveredRevenue) : '—'} />
        <Kpi label="Inventory Alerts" value={k.inventoryAlerts ?? '—'} tone="alert" />
        <Kpi label="Open Invoices" value={k.openInvoices ?? '—'} />
        <Kpi label="Open Tickets" value={k.openTickets ?? '—'} />
        <Kpi label="Active Employees" value={k.activeEmployees ?? '—'} />
        <Kpi label="Active Alarms" value={k.activeAlarms ?? '—'} tone="alert" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Orders by Status</h2>
          {m && m.ordersByStatus && m.ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.ordersByStatus}>
                <XAxis dataKey="status" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {m.ordersByStatus.map((_, i) => <Cell key={i} fill="var(--color-primary)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400">No order data yet.</p>}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Recent Alerts</h2>
          {alerts.length === 0 && <p className="text-sm text-gray-400">Nothing to report.</p>}
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.alertId} className="text-sm">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-primary'}`} />
                <span className="text-gray-700">{a.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
