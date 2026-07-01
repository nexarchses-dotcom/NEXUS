import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';
import DataTable from '../components/DataTable.jsx';

const blankLine = () => ({ accountId: '', debit: '', credit: '', description: '' });

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState({ date: '', description: '', reference: '' });
  const [lines, setLines] = useState([blankLine(), blankLine()]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: e }, { data: a }] = await Promise.all([
        api.list('journal-entries', { pageSize: 200 }),
        api.list('chart-of-accounts', { pageSize: 500 })
      ]);
      setEntries(e || []); setAccounts(a || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.round(totalDebit * 100) === Math.round(totalCredit * 100) && totalDebit > 0;

  function setLine(i, key, val) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  }

  async function submit() {
    if (!balanced) { toast.error('Entry must balance and be non-zero'); return; }
    setBusy(true);
    try {
      const payload = {
        ...header,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ accountId: l.accountId, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description }))
      };
      await api.createJournalEntry(payload);
      toast.success('Journal entry created (Draft)');
      setOpen(false); setHeader({ date: '', description: '', reference: '' });
      setLines([blankLine(), blankLine()]); load();
    } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  async function post(row) {
    try { await api.postJournalEntry(row.entryId); toast.success('Posted to ledger'); load(); }
    catch (e) { toast.error(e.message); }
  }

  const columns = [
    { key: 'date', label: 'Date' }, { key: 'description', label: 'Description' },
    { key: 'reference', label: 'Reference' }, { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Journal Entries</h1>
        <button onClick={() => setOpen(true)}
          className="px-4 py-2 text-sm font-medium rounded bg-primary text-white hover:bg-primary-dark">New Entry</button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <DataTable columns={columns} rows={entries}
          renderActions={(row) => row.status === 'Draft'
            ? <button onClick={() => post(row)} className="text-green-600 hover:underline">Post</button> : null} />
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">New Journal Entry</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input type="date" value={header.date} onChange={(e) => setHeader({ ...header, date: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded" />
              <input placeholder="Description" value={header.description}
                onChange={(e) => setHeader({ ...header, description: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded sm:col-span-2" />
              <input placeholder="Reference" value={header.reference}
                onChange={(e) => setHeader({ ...header, reference: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded" />
            </div>

            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">Account</th><th className="py-1 w-28">Debit</th>
                  <th className="py-1 w-28">Credit</th><th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-1">
                      <select value={l.accountId} onChange={(e) => setLine(i, 'accountId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded">
                        <option value="">Select account…</option>
                        {accounts.map((a) => (
                          <option key={a.accountId} value={a.accountId}>{a.accountCode} — {a.accountName}</option>
                        ))}
                      </select>
                    </td>
                    <td className="pr-2 py-1">
                      <input type="number" value={l.debit}
                        onChange={(e) => setLine(i, 'debit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded" /></td>
                    <td className="pr-2 py-1">
                      <input type="number" value={l.credit}
                        onChange={(e) => setLine(i, 'credit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded" /></td>
                    <td className="py-1">
                      {lines.length > 2 && (
                        <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                          className="text-red-500 px-2">×</button>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={() => setLines((ls) => [...ls, blankLine()])}
              className="text-sm text-primary hover:underline mb-4">+ Add line</button>

            <div className={`flex justify-between text-sm font-medium p-3 rounded mb-4 ${
              balanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              <span>Debits: {totalDebit.toFixed(2)}</span>
              <span>Credits: {totalCredit.toFixed(2)}</span>
              <span>{balanced ? 'Balanced ✓' : `Out of balance: ${(totalDebit - totalCredit).toFixed(2)}`}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={submit} disabled={!balanced || busy}
                className="px-4 py-2 text-sm font-medium rounded bg-primary text-white hover:bg-primary-dark disabled:opacity-50">
                {busy ? 'Saving…' : 'Create Draft'}
              </button>
              <button onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
