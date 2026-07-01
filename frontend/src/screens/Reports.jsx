import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';

const TABS = [
  { key: 'trial-balance', label: 'Trial Balance' },
  { key: 'financial', label: 'P&L + Balance Sheet' },
  { key: 'accounts-receivable', label: 'AR Aging' },
  { key: 'accounts-payable', label: 'AP Aging' }
];

function money(n) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function Reports() {
  const [tab, setTab] = useState('trial-balance');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run(name) {
    setTab(name); setData(null); setLoading(true);
    try { const { data } = await api.report(name); setData(data); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Financial Reports</h1>
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => run(t.key)}
            className={`px-3 py-1.5 text-sm rounded border ${tab === t.key && data
              ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400 text-sm">Computing…</p>}

      {!loading && data && tab === 'trial-balance' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-primary-soft text-left">
              <th className="px-3 py-2">Code</th><th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-right">Balance</th>
            </tr></thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.accountCode}</td><td className="px-3 py-2">{r.accountName}</td>
                  <td className="px-3 py-2">{r.type}</td><td className="px-3 py-2 text-right">{money(r.debit)}</td>
                  <td className="px-3 py-2 text-right">{money(r.credit)}</td>
                  <td className="px-3 py-2 text-right">{money(r.balance)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="px-3 py-2" colSpan={3}>Total</td>
                <td className="px-3 py-2 text-right">{money(data.totalDebit)}</td>
                <td className="px-3 py-2 text-right">{money(data.totalCredit)}</td>
                <td className={`px-3 py-2 text-right ${data.balanced ? 'text-green-600' : 'text-red-600'}`}>
                  {data.balanced ? 'Balanced ✓' : 'OUT'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && tab === 'financial' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Profit &amp; Loss</h2>
            <Row label="Revenue" v={data.profitAndLoss.revenue} />
            <Row label="Expenses" v={data.profitAndLoss.expenses} />
            <Row label="Net Income" v={data.profitAndLoss.netIncome} bold />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Balance Sheet</h2>
            <Row label="Assets" v={data.balanceSheet.assets} />
            <Row label="Liabilities" v={data.balanceSheet.liabilities} />
            <Row label="Equity" v={data.balanceSheet.equity} />
            <Row label="Equity + Net Income" v={data.balanceSheet.equityPlusNetIncome} />
            <p className={`mt-3 text-sm font-medium ${data.balanceSheet.balanced ? 'text-green-600' : 'text-red-600'}`}>
              {data.balanceSheet.balanced ? 'Assets = Liabilities + Equity ✓' : 'Out of balance'}
            </p>
          </div>
        </div>
      )}

      {!loading && data && (tab === 'accounts-receivable' || tab === 'accounts-payable') && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {['current', 'd1_30', 'd31_60', 'd61_90', 'd90plus'].map((b) => (
              <div key={b} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs uppercase text-gray-500">{b.replace('d', '').replace('_', '–')}</p>
                <p className="text-lg font-semibold text-primary mt-1">{money(data.buckets[b])}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">Total outstanding: <span className="font-semibold">{money(data.totalOutstanding)}</span></p>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-primary-soft text-left">
                <th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Due</th>
                <th className="px-3 py-2 text-right">Days Past Due</th><th className="px-3 py-2 text-right">Outstanding</th>
              </tr></thead>
              <tbody>
                {data.items.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">No open invoices.</td></tr>}
                {data.items.map((i, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-3 py-2">{i.invoiceNumber}</td><td className="px-3 py-2">{i.dueDate}</td>
                    <td className="px-3 py-2 text-right">{i.daysPastDue}</td>
                    <td className="px-3 py-2 text-right">{money(i.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !data && <p className="text-gray-400 text-sm">Pick a report above.</p>}
    </div>
  );
}

function Row({ label, v, bold }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold border-t border-gray-200 mt-1 pt-2' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span>{Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  );
}
