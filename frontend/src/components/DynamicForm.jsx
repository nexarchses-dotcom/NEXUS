import React, { useEffect, useState } from 'react';

/**
 * Renders a form purely from FormFields config (no per-module hand-coding).
 * @param {Array} fields  FormFields rows: { fieldKey, label, type, required, options, readonly }
 * @param {Object} initial  existing record (edit) or {}
 * @param {function} onSubmit (record) => Promise
 * @param {Object} serverErrors  optional { fieldKey: message } from a VALIDATION_FAILED response
 */
export default function DynamicForm({ fields, initial = {}, onSubmit, onCancel, serverErrors }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { setValues({ ...initial }); }, [JSON.stringify(initial)]);
  useEffect(() => { if (serverErrors) setErrors(serverErrors); }, [serverErrors]);

  function set(key, val) { setValues((v) => ({ ...v, [key]: val })); }

  function parseOptions(f) {
    if (!f.options) return [];
    try { return JSON.parse(f.options); } catch { return []; }
  }

  function validate() {
    const e = {};
    fields.forEach((f) => {
      const required = String(f.required).toLowerCase() === 'true';
      const v = values[f.fieldKey];
      if (required && (v === undefined || v === null || String(v) === '')) {
        e[f.fieldKey] = `${f.label} is required.`;
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setBusy(true);
    try { await onSubmit(values); } finally { setBusy(false); }
  }

  function field(f) {
    const v = values[f.fieldKey] ?? '';
    const ro = String(f.readonly).toLowerCase() === 'true';
    const base = 'w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/40';
    const cls = `${base} ${errors[f.fieldKey] ? 'border-red-400' : 'border-gray-300'}`;
    switch (f.type) {
      case 'textarea':
        return <textarea rows={3} className={cls} value={v} disabled={ro}
          onChange={(e) => set(f.fieldKey, e.target.value)} />;
      case 'select':
        return (
          <select className={cls} value={v} disabled={ro}
            onChange={(e) => set(f.fieldKey, e.target.value)}>
            <option value="">Select…</option>
            {parseOptions(f).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'number': case 'currency':
        return <input type="number" className={cls} value={v} disabled={ro}
          onChange={(e) => set(f.fieldKey, e.target.value)} />;
      case 'boolean':
        return <input type="checkbox" checked={!!v} disabled={ro}
          onChange={(e) => set(f.fieldKey, e.target.checked)} />;
      case 'date':
        return <input type="date" className={cls} value={v} disabled={ro}
          onChange={(e) => set(f.fieldKey, e.target.value)} />;
      default:
        return <input type={f.type === 'email' ? 'email' : 'text'} className={cls} value={v} disabled={ro}
          onChange={(e) => set(f.fieldKey, e.target.value)} />;
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.fieldKey}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {f.label}{String(f.required).toLowerCase() === 'true' && <span className="text-red-500"> *</span>}
          </label>
          {field(f)}
          {errors[f.fieldKey] && <p className="text-xs text-red-600 mt-1">{errors[f.fieldKey]}</p>}
        </div>
      ))}
      <div className="flex items-center gap-2 pt-2">
        <button onClick={submit} disabled={busy}
          className="px-4 py-2 text-sm font-medium rounded bg-primary text-white
                     hover:bg-primary-dark disabled:opacity-50 transition-colors">
          {busy ? 'Saving…' : 'Save'}
        </button>
        {onCancel && <button onClick={onCancel}
          className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>}
      </div>
    </div>
  );
}
