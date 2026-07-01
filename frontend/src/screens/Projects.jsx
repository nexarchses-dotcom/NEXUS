import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { api } from '../lib/api.js';
import DataTable from '../components/DataTable.jsx';
import DynamicForm from '../components/DynamicForm.jsx';

const STATUS_COLOR = {
  Planning: 'bg-gray-300', Active: 'bg-primary', OnHold: 'bg-amber-400', Completed: 'bg-green-500'
};

function daySpan(start, end, rangeStart, rangeEnd, totalDays) {
  const s = new Date(start), e = new Date(end || start);
  const clampS = Math.max(0, Math.round((s - rangeStart) / 86400000));
  const clampE = Math.min(totalDays, Math.round((e - rangeStart) / 86400000) + 1);
  return { left: (clampS / totalDays) * 100, width: Math.max(2, ((clampE - clampS) / totalDays) * 100) };
}

function Timeline({ project, milestones, tasks }) {
  const dates = [project.startDate, project.endDate,
    ...milestones.map((m) => m.dueDate), ...tasks.map((t) => t.dueDate)].filter(Boolean).map((d) => new Date(d));
  if (dates.length === 0) return <p className="text-sm text-gray-400">No dates set yet.</p>;
  const rangeStart = new Date(Math.min(...dates));
  const rangeEnd = new Date(Math.max(...dates));
  const totalDays = Math.max(1, Math.round((rangeEnd - rangeStart) / 86400000) + 7);

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 flex justify-between">
        <span>{rangeStart.toLocaleDateString()}</span><span>{rangeEnd.toLocaleDateString()}</span>
      </div>
      {project.startDate && (
        <Row label="Project" color="bg-primary-dark"
          span={daySpan(project.startDate, project.endDate || project.startDate, rangeStart, rangeEnd, totalDays)} />
      )}
      {milestones.map((m) => m.dueDate && (
        <Row key={m.milestoneId} label={`◆ ${m.name}`}
          color={m.status === 'Completed' ? 'bg-green-500' : 'bg-amber-400'}
          span={daySpan(m.dueDate, m.dueDate, rangeStart, rangeEnd, totalDays)} thin />
      ))}
      {tasks.map((t) => t.dueDate && (
        <Row key={t.taskId} label={t.title}
          color={t.status === 'Done' ? 'bg-green-400' : t.status === 'InProgress' ? 'bg-primary' : 'bg-gray-300'}
          span={daySpan(t.dueDate, t.dueDate, rangeStart, rangeEnd, totalDays)} thin />
      ))}
    </div>
  );
}

function Row({ label, color, span, thin }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-xs text-gray-600 truncate">{label}</span>
      <div className="relative flex-1 h-4 bg-gray-100 rounded">
        <div className={`absolute top-0 h-full rounded ${color} ${thin ? 'h-2 mt-1' : ''}`}
          style={{ left: `${span.left}%`, width: `${span.width}%` }} />
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [board, setBoard] = useState(null);       // { project, milestones, tasks }
  const [taskForm, setTaskForm] = useState(null);  // {} to open new-task modal

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: ff }] = await Promise.all([
        api.list('projects', { pageSize: 200 }), api.formFields('Projects')
      ]);
      setProjects(p || []); setFields(ff || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(record) {
    try {
      if (editing[editing._idKey]) await api.update('projects', editing.projectId, record);
      else await api.create('projects', record);
      toast.success('Saved'); setEditing(null); load();
    } catch (e) { toast.error(e.message); }
  }

  async function openBoard(row) {
    try { const { data } = await api.projectBoard(row.projectId); setBoard(data); }
    catch (e) { toast.error(e.message); }
  }

  async function addTask(payload) {
    try { await api.create('tasks', { ...payload, projectId: board.project.projectId }); toast.success('Task added');
      setTaskForm(null); const { data } = await api.projectBoard(board.project.projectId); setBoard(data); }
    catch (e) { toast.error(e.message); }
  }

  const columns = fields.map((f) => ({ key: f.fieldKey, label: f.label }));
  if (!columns.some((c) => c.key === 'status')) columns.push({ key: 'status', label: 'Status' });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
        <button onClick={() => setEditing({})}
          className="px-4 py-2 text-sm font-medium rounded bg-primary text-white hover:bg-primary-dark">New Project</button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <DataTable columns={columns} rows={projects}
          onEdit={(r) => setEditing(r)}
          renderActions={(row) => <button onClick={() => openBoard(row)} className="text-primary hover:underline">Board</button>} />
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{editing.projectId ? 'Edit Project' : 'New Project'}</h2>
            <DynamicForm fields={fields} initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}

      {board && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setBoard(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">{board.project.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full text-white ${STATUS_COLOR[board.project.status] || 'bg-gray-400'}`}>
                {board.project.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">{board.project.description}</p>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <Timeline project={board.project} milestones={board.milestones} tasks={board.tasks} />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Tasks ({board.tasks.length})</h3>
              <button onClick={() => setTaskForm({})} className="text-sm text-primary hover:underline">+ Add task</button>
            </div>
            <div className="space-y-1 mb-4">
              {board.tasks.length === 0 && <p className="text-sm text-gray-400">No tasks yet.</p>}
              {board.tasks.map((t) => (
                <div key={t.taskId} className="flex items-center justify-between text-sm border-t border-gray-100 py-1.5">
                  <span>{t.title}</span>
                  <span className="text-xs text-gray-500">{t.status} · {t.dueDate || 'no due date'}</span>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Milestones ({board.milestones.length})</h3>
            <div className="space-y-1 mb-4">
              {board.milestones.length === 0 && <p className="text-sm text-gray-400">No milestones yet.</p>}
              {board.milestones.map((m) => (
                <div key={m.milestoneId} className="flex items-center justify-between text-sm border-t border-gray-100 py-1.5">
                  <span>◆ {m.name}</span><span className="text-xs text-gray-500">{m.status} · {m.dueDate}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setBoard(null)} className="px-4 py-2 text-sm rounded border border-gray-300">Close</button>
          </div>
        </div>
      )}

      {taskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
          onClick={(e) => { if (e.target === e.currentTarget) setTaskForm(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-3">New Task</h3>
            <QuickTaskForm onSubmit={addTask} onCancel={() => setTaskForm(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function QuickTaskForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  return (
    <div className="space-y-3 text-sm">
      <input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded" />
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded" />
      <select value={priority} onChange={(e) => setPriority(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded">
        <option>Low</option><option>Medium</option><option>High</option>
      </select>
      <div className="flex gap-2">
        <button onClick={() => title && onSubmit({ title, dueDate, priority, status: 'ToDo' })}
          className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark">Add</button>
        <button onClick={onCancel} className="px-4 py-2 rounded border border-gray-300">Cancel</button>
      </div>
    </div>
  );
}
