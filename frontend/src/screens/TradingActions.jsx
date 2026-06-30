import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';

export function AcceptQuote(row, reload) {
  if (row.status !== 'Submitted') return null;
  return (
    <button onClick={async () => {
      try { const { data } = await api.acceptQuote(row.quoteId);
        toast.success(data?.extra?.orderCreated ? 'Quote accepted — order created' : 'Quote accepted');
        reload();
      } catch (e) { toast.error(e.message); }
    }} className="text-green-600 hover:underline">Accept</button>
  );
}

export function OrderStatus(row, reload) {
  const [busy, setBusy] = useState(false);
  const next = { Confirmed: ['Shipped', 'Cancelled'], Shipped: ['Delivered', 'Cancelled'] }[row.status] || [];
  if (next.length === 0) return null;
  return (
    <select disabled={busy} defaultValue="" className="text-sm border border-gray-300 rounded px-1 py-0.5"
      onChange={async (e) => {
        const status = e.target.value; if (!status) return;
        setBusy(true);
        try { await api.setOrderStatus(row.orderId, status); toast.success(`Order → ${status}`); reload(); }
        catch (err) { toast.error(err.message); } finally { setBusy(false); }
      }}>
      <option value="">Set status…</option>
      {next.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

export function POStatus(row, reload) {
  const chain = ['Draft','Issued','Acknowledged','PartiallyReceived','FullyReceived','Invoiced','Paid','Closed'];
  const idx = chain.indexOf(row.status);
  if (idx < 0 || idx === chain.length - 1) return null;
  const nextStatus = chain[idx + 1];
  return (
    <button onClick={async () => {
      try { await api.setPOStatus(row.poId, nextStatus); toast.success(`PO → ${nextStatus}`); reload(); }
      catch (e) { toast.error(e.message); }
    }} className="text-primary hover:underline">→ {nextStatus}</button>
  );
}

export function RequisitionApprove(row, reload) {
  if (['Approved','Rejected','Converted'].indexOf(row.status) !== -1) return null;
  const act = async (decision) => {
    try { await api.approveRequisition(row.reqId, decision); toast.success(decision); reload(); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <span className="space-x-2">
      <button onClick={() => act('Approved')} className="text-green-600 hover:underline">Approve</button>
      <button onClick={() => act('Rejected')} className="text-red-600 hover:underline">Reject</button>
    </span>
  );
}
