import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';
import DataTable from '../components/DataTable.jsx';

function money(n) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function PayrollRuns() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ periodStart: '', periodEnd: '', entityId: '' });
  const [progress, setProgress] = useState(null);
  const [slips, setSlips] = useState(null);      // { run, list }
  const [detail, setDetail] = useState(null);    // parsed payslip details

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.list('payroll-runs', { pageSize: 200 }); setRuns(data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createRun() {
    if (!form.periodStart || !form.periodEnd) { toast.error('Period start and end required'); return; }
    try { await api.create('payroll-runs', form); toast.success('Run created (Draft)'); setOpen(false);
      setForm({ periodStart: '', periodEnd: '', entityId: '' }); load(); }
    catch (e) { toast.error(e.message); }
  }

  // Batched processing: call /process until done.
  async function processRun(row) {
    setProgress({ runId: row.runId, processed: 0, total: 0 });
    try {
      let done = false, guard = 0;
      while (!done && guard < 200) {
        const { data } = await api.processPayroll(row.runId);
        setProgress({ runId: row.runId, processed: data.total - data.remaining, total: data.total });
        done = data.done; guard++;
      }
      toast.success('Payroll processed');
      setProgress(null); load();
    } catch (e) { toast.error(e.message); setProgress(null); }
  }

  async function viewSlips(row) {
    try { const { data } = await api.list('payslips', { runId: row.runId, pageSize: 500 });
      setSlips({ run: row, list: data || [] }); }
    catch (e) { toast.error(e.message); }
  }

  const columns = [
    { key: 'periodStart', label: 'Period Start' }, { key: 'periodEnd', label: 'Period End' },
    { key: 'processedDate', label: 'Processed' }, { key: 'status', label: 'Status' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Payroll Runs</h1>
        <button onClick={() => setOpen(true)}
          className="px-4 py-2 text-sm font-medium rounded bg-primary text-white hover:bg-primary-dark">New Run</button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <DataTable columns={columns} rows={runs} renderActions={(row) => (
          <span className="space-x-3">
            {row.status === 'Draft' && (
              <button onClick={() => processRun(row)} disabled={progress}
                className="text-green-600 hover:underline disabled:opacity-50">
                {progress && progress.runId === row.runId
                  ? `Processing ${progress.processed}/${progress.total}…` : 'Process'}
              </button>
            )}
            <button onClick={() => viewSlips(row)} className="text-primary hover:underline">Payslips</button>
          </span>
        )} />
      )}

      {/* New run modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">New Payroll Run</h2>
            <label className="block text-sm text-gray-600 mb-1">Period Start</label>
            <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-3" />
            <label className="block text-sm text-gray-600 mb-1">Period End</label>
            <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-4" />
            <div className="flex gap-2">
              <button onClick={createRun} className="px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary-dark">Create</button>
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded border border-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Payslips list */}
      {slips && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSlips(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">Payslips — {slips.run.periodStart} to {slips.run.periodEnd}</h2>
            <table className="w-full text-sm">
              <thead><tr className="bg-primary-soft text-left">
                <th className="px-3 py-2">Employee</th><th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2 text-right">Deductions</th><th className="px-3 py-2 text-right">Net</th><th></th>
              </tr></thead>
              <tbody>
                {slips.list.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No payslips yet — process the run.</td></tr>}
                {slips.list.map((p) => (
                  <tr key={p.payslipId} className="border-t border-gray-100">
                    <td className="px-3 py-2">{p.employeeId}</td>
                    <td className="px-3 py-2 text-right">{money(p.grossPay)}</td>
                    <td className="px-3 py-2 text-right">{money(p.deductions)}</td>
                    <td className="px-3 py-2 text-right font-medium">{money(p.netPay)}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="text-primary hover:underline" onClick={() => {
                        try { setDetail(JSON.parse(p.details)); } catch { setDetail({}); }
                      }}>Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setSlips(null)} className="mt-4 px-4 py-2 text-sm rounded border border-gray-300">Close</button>
          </div>
        </div>
      )}

      {/* Payslip breakdown */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
          onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-sm">
            <h3 className="font-semibold mb-3">Payslip Breakdown</h3>
            <p className="font-medium text-gray-700">Earnings</p>
            {(detail.earnings || []).map((e, i) => (
              <div key={i} className="flex justify-between"><span className="text-gray-500">{e.component}</span><span>{money(e.amount)}</span></div>
            ))}
            <p className="font-medium text-gray-700 mt-3">Statutory</p>
            {detail.statutory && Object.entries(detail.statutory).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span>{money(v)}</span></div>
            ))}
            {(detail.otherDeductions || []).length > 0 && <p className="font-medium text-gray-700 mt-3">Other Deductions</p>}
            {(detail.otherDeductions || []).map((d, i) => (
              <div key={i} className="flex justify-between"><span className="text-gray-500">{d.component}</span><span>{money(d.amount)}</span></div>
            ))}
            <div className="flex justify-between border-t border-gray-200 mt-3 pt-2 font-semibold">
              <span>Net Pay</span><span>{money(detail.net)}</span>
            </div>
            <button onClick={() => setDetail(null)} className="mt-4 px-4 py-2 text-sm rounded border border-gray-300 w-full">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
