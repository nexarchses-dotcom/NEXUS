import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';

const GROUPS = ['Active', 'Acknowledged', 'Resolved'];
const DOT = { Active: 'bg-red-500', Acknowledged: 'bg-amber-500', Resolved: 'bg-green-500' };

export default function Alarms() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.list('alarms', { pageSize: 500 }); setAlarms(data || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function ack(a) { try { await api.acknowledgeAlarm(a.alarmId); toast.success('Acknowledged'); load(); } catch (e) { toast.error(e.message); } }
  async function resolve(a) { try { await api.resolveAlarm(a.alarmId, 'Resolved from console'); toast.success('Resolved'); load(); } catch (e) { toast.error(e.message); } }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Alarms</h1>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {GROUPS.map((g) => {
            const items = alarms.filter((a) => a.status === g);
            return (
              <div key={g} className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${DOT[g]}`} />{g} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.length === 0 && <p className="text-sm text-gray-400">None.</p>}
                  {items.map((a) => (
                    <div key={a.alarmId} className="border border-gray-100 rounded p-2 text-sm">
                      <p className="text-gray-700">{a.notes || a.alarmRuleId}</p>
                      <p className="text-xs text-gray-400">{String(a.triggeredAt).replace('T', ' ').slice(0, 19)}</p>
                      <div className="mt-1 space-x-3">
                        {g === 'Active' && <button onClick={() => ack(a)} className="text-amber-600 hover:underline text-xs">Acknowledge</button>}
                        {g !== 'Resolved' && <button onClick={() => resolve(a)} className="text-green-600 hover:underline text-xs">Resolve</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
