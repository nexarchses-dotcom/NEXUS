import React, { useMemo, useState } from 'react';

/**
 * Generic, config-driven table.
 * @param {Array} columns  [{ key, label }]
 * @param {Array} rows
 * @param {function} onEdit, onDelete  optional row actions
 */
export default function DataTable({ columns, rows, onEdit, onDelete }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let r = rows;
    if (query) {
      const q = query.toLowerCase();
      r = r.filter((row) => columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q)));
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = String(a[sortKey] ?? ''), bv = String(b[sortKey] ?? '');
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return r;
  }, [rows, query, sortKey, sortDir, columns]);

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-100">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search"
          className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded
                     focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-soft text-left">
              {columns.map((c) => (
                <th key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="px-3 py-2 font-semibold text-gray-700 cursor-pointer whitespace-nowrap">
                  {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-gray-400">
                Nothing here yet. Add the first record to get started.
              </td></tr>
            )}
            {pageRows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {String(row[c.key] ?? '')}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {onEdit && <button onClick={() => onEdit(row)}
                      className="text-primary hover:underline mr-3">Edit</button>}
                    {onDelete && <button onClick={() => onDelete(row)}
                      className="text-red-600 hover:underline">Delete</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-sm text-gray-600">
        <span>{total} record{total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 rounded disabled:opacity-40 hover:bg-gray-100">Prev</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded disabled:opacity-40 hover:bg-gray-100">Next</button>
        </div>
      </div>
    </div>
  );
}
