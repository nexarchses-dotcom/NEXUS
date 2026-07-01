import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';

const TYPES = ['', 'CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED', 'LOGIN', 'ERROR'];

export default function EventLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ module: '', eventType: '' });
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { pageSize: 300 };
      if (filter.module) params.module = filter.module;
      if (filter.eventType) params.eventType = filter.eventType;
      const { data } = await api.list('event-log', params);
      setRows((data || []).slice().reverse());
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Event Log</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <input placeholder="Filter module" value={filter.module}
          onChange={(e) => setFilter({ ...filter, module: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded" />
        <select value={filter.eventType} onChange={(e) => setFilter({ ...filter, eventType: e.target.value })}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded">
          {TYPES.map((t) => <option key={t} value={t}>{t || 'All event types'}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-primary-soft text-left">
              <th className="px-3 py-2">Time</th><th className="px-3 py-2">Module</th>
              <th className="px-3 py-2">Event</th><th className="px-3 py-2">Summary</th><th className="px-3 py-2">User</th><th></th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No events.</td></tr>}
              {rows.slice(0, 200).map((r) => (
                <tr key={r.eventId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{String(r.timestamp).replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-3 py-2">{r.module}</td>
                  <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded bg-gray-100">{r.eventType}</span></td>
                  <td className="px-3 py-2 text-gray-700">{r.summary}</td>
                  <td className="px-3 py-2 text-gray-500">{String(r.userId).slice(0, 8)}</td>
                  <td className="px-3 py-2 text-right">
                    {r.details && <button className="text-primary hover:underline" onClick={() => setDetail(r)}>View</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="font-semibold mb-2">{detail.eventType} · {detail.module}</h2>
            <p className="text-sm text-gray-500 mb-3">{detail.summary}</p>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">{
              (() => { try { return JSON.stringify(JSON.parse(detail.details), null, 2); } catch { return detail.details; } })()
            }</pre>
            <button onClick={() => setDetail(null)} className="mt-4 px-4 py-2 text-sm rounded border border-gray-300">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
