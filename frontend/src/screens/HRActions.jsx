import React from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';

export function LeaveApprove(row, reload) {
  if (['Approved', 'Rejected'].indexOf(row.status) !== -1) return null;
  const act = async (decision) => {
    try {
      const { data } = await api.approveLeave(row.requestId, decision);
      toast.success(data?.extra?.warning ? `${decision} — ${data.extra.warning}` : decision);
      reload();
    } catch (e) { toast.error(e.message); }
  };
  return (
    <span className="space-x-2">
      <button onClick={() => act('Approved')} className="text-green-600 hover:underline">Approve</button>
      <button onClick={() => act('Rejected')} className="text-red-600 hover:underline">Reject</button>
    </span>
  );
}
