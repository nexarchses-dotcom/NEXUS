import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';
import DataTable from '../components/DataTable.jsx';
import DynamicForm from '../components/DynamicForm.jsx';

/**
 * One generic screen drives any CRUD module.
 * Columns + form fields both come from the FormFields config — no per-module code.
 *
 * @param {string} module  url segment, e.g. "products"
 * @param {string} title   display title
 * @param {string} idField primary key field name, e.g. "productId"
 */
export default function ModuleScreen({ module, title, idField }) {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // record or {} (new) or null (closed)
  const [serverErrors, setServerErrors] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: list }, { data: ff }] = await Promise.all([
        api.list(module, { pageSize: 200 }),
        api.formFields(toModuleKey(module))
      ]);
      setRows(list || []);
      setFields(ff || []);
    } catch (e) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }, [module]);

  useEffect(() => { load(); }, [load]);

  const columns = fields.map((f) => ({ key: f.fieldKey, label: f.label }));

  async function save(record) {
    setServerErrors(null);
    try {
      if (editing && editing[idField]) {
        await api.update(module, editing[idField], record);
        toast.success('Updated');
      } else {
        await api.create(module, record);
        toast.success('Created');
      }
      setEditing(null);
      load();
    } catch (e) {
      if (e.code === 'VALIDATION_FAILED' && e.fields) setServerErrors(e.fields);
      else toast.error(e.message);
    }
  }

  async function remove(row) {
    if (!confirm(`Delete this ${title.toLowerCase()} record?`)) return;
    try { await api.remove(module, row[idField]); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <button onClick={() => { setServerErrors(null); setEditing({}); }}
          className="px-4 py-2 text-sm font-medium rounded bg-primary text-white hover:bg-primary-dark transition-colors">
          New {title}
        </button>
      </div>

      {loading
        ? <p className="text-gray-400 text-sm">Loading…</p>
        : <DataTable columns={columns} rows={rows}
            onEdit={(r) => { setServerErrors(null); setEditing(r); }} onDelete={remove} />}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing[idField] ? `Edit ${title}` : `New ${title}`}
            </h2>
            <DynamicForm fields={fields} initial={editing} serverErrors={serverErrors}
              onSubmit={save} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// url segment -> license/permission/config module key (mirrors backend moduleKey_)
function toModuleKey(segment) {
  const map = { products: 'Products' };
  return map[segment] || segment;
}
