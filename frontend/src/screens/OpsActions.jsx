import React from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';

export function StockTransferStatus(row, reload) {
  const next = { Requested: 'InTransit', InTransit: 'Received' }[row.status];
  if (!next) return null;
  return (
    <button onClick={async () => {
      try { await api.setStockTransferStatus(row.transferId, next); toast.success(`Transfer → ${next}`); reload(); }
      catch (e) { toast.error(e.message); }
    }} className="text-primary hover:underline">→ {next}</button>
  );
}

export function ShipmentStatus(row, reload) {
  const chain = ['Pending', 'Shipped', 'InTransit', 'Delivered'];
  const idx = chain.indexOf(row.status);
  if (idx < 0 || idx === chain.length - 1) return null;
  const next = chain[idx + 1];
  return (
    <button onClick={async () => {
      try { await api.setShipmentStatus(row.shipmentId, next); toast.success(`Shipment → ${next}`); reload(); }
      catch (e) { toast.error(e.message); }
    }} className="text-primary hover:underline">→ {next}</button>
  );
}
