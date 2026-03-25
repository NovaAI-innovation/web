'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, Milestone, Activity } from '@/lib/project-store';
import {
  Check, Plus, Trash2, Save,
  CheckSquare, Square, MessageSquare, DollarSign, FileText,
} from 'lucide-react';

type Client = { id: string; name: string };

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10'
    : status === 'planning' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
    : 'border-chimera-border text-chimera-text-muted';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

export default function AdminProjectEditor({
  project: initial,
  clients,
}: {
  project: Project;
  clients: Client[];
}) {
  const router = useRouter();
  const [project, setProject] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' });
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [activityNote, setActivityNote] = useState('');
  const [activityType, setActivityType] = useState<Activity['type']>('note');
  const [postingActivity, setPostingActivity] = useState(false);
  const [error, setError] = useState('');

  // Meta editing state
  const [meta, setMeta] = useState({
    name: project.name,
    clientId: project.clientId ?? '',
    status: project.status,
    budgetAllocated: String(project.budget.allocated),
    budgetSpent: String(project.budget.spent),
    currentEnd: project.schedule.currentEnd,
  });

  const saveMeta = async () => {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: meta.name,
        clientId: meta.clientId || undefined,
        status: meta.status,
        budget: { allocated: Number(meta.budgetAllocated), spent: Number(meta.budgetSpent) },
        schedule: {
          ...project.schedule,
          currentEnd: meta.currentEnd,
          daysVariance: Math.round(
            (new Date(meta.currentEnd).getTime() - new Date(project.schedule.baselineEnd).getTime()) /
            (1000 * 60 * 60 * 24),
          ),
        },
      }),
    });
    const payload = await res.json() as { data: Project | null; error: { message: string } | null };
    if (payload.data) {
      setProject(payload.data);
      setEditingMeta(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(payload.error?.message ?? 'Save failed');
    }
    setSaving(false);
    router.refresh();
  };

  const toggleMilestone = async (m: Milestone) => {
    const res = await fetch(`/api/admin/projects/${project.id}/milestones/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !m.completed }),
    });
    const payload = await res.json() as { data: Milestone | null };
    if (payload.data) {
      setProject((prev) => ({
        ...prev,
        milestones: prev.milestones.map((ml) => ml.id === m.id ? { ...ml, completed: !m.completed } : ml),
        progress: Math.round(
          prev.milestones.filter((ml) => ml.id === m.id ? !m.completed : ml.completed).length /
          prev.milestones.length * 100,
        ),
      }));
    }
    router.refresh();
  };

  const deleteMilestone = async (id: string) => {
    await fetch(`/api/admin/projects/${project.id}/milestones/${id}`, { method: 'DELETE' });
    setProject((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));
    router.refresh();
  };

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.title || !newMilestone.dueDate) return;
    setAddingMilestone(true);
    const res = await fetch(`/api/admin/projects/${project.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMilestone, completed: false }),
    });
    const payload = await res.json() as { data: Milestone | null };
    if (payload.data) {
      setProject((prev) => ({ ...prev, milestones: [...prev.milestones, payload.data!] }));
      setNewMilestone({ title: '', dueDate: '' });
    }
    setAddingMilestone(false);
    router.refresh();
  };

  const postActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityNote.trim()) return;
    setPostingActivity(true);
    const res = await fetch(`/api/admin/projects/${project.id}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: activityNote, type: activityType }),
    });
    const payload = await res.json() as { data: Activity | null };
    if (payload.data) {
      setProject((prev) => ({ ...prev, activity: [payload.data!, ...prev.activity] }));
      setActivityNote('');
    }
    setPostingActivity(false);
    router.refresh();
  };

  const deleteProject = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/projects/${project.id}`, { method: 'DELETE' });
    router.push('/admin/projects');
  };

  const activityIcons: Record<Activity['type'], typeof MessageSquare> = {
    note: MessageSquare,
    milestone: CheckSquare,
    document: FileText,
    budget: DollarSign,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-2">{project.name}</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={project.status} />
            {project.clientId && (
              <span className="text-xs text-chimera-text-muted">
                {clients.find((c) => c.id === project.clientId)?.name ?? project.clientId}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            onClick={() => setEditingMeta(!editingMeta)}
            className="px-3 py-2 text-sm border border-chimera-border rounded-lg hover:border-chimera-gold/50 transition"
          >
            {editingMeta ? 'Cancel' : 'Edit Details'}
          </button>
          <button
            onClick={deleteProject}
            className="px-3 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Meta edit form */}
      {editingMeta && (
        <div className="bg-chimera-dark border border-chimera-border rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-4">Project Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-chimera-text-muted mb-1.5">Project Name</label>
              <input
                value={meta.name}
                onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
              />
            </div>
            <div>
              <label className="block text-xs text-chimera-text-muted mb-1.5">Client</label>
              <select
                value={meta.clientId}
                onChange={(e) => setMeta({ ...meta, clientId: e.target.value })}
                className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
              >
                <option value="">Unassigned</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-chimera-text-muted mb-1.5">Status</label>
              <select
                value={meta.status}
                onChange={(e) => setMeta({ ...meta, status: e.target.value as Project['status'] })}
                className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-chimera-text-muted mb-1.5">Budget Allocated (CAD)</label>
              <input
                type="number"
                value={meta.budgetAllocated}
                onChange={(e) => setMeta({ ...meta, budgetAllocated: e.target.value })}
                className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
              />
            </div>
            <div>
              <label className="block text-xs text-chimera-text-muted mb-1.5">Budget Spent (CAD)</label>
              <input
                type="number"
                value={meta.budgetSpent}
                onChange={(e) => setMeta({ ...meta, budgetSpent: e.target.value })}
                className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
              />
            </div>
            <div>
              <label className="block text-xs text-chimera-text-muted mb-1.5">Current End Date</label>
              <input
                type="date"
                value={meta.currentEnd}
                onChange={(e) => setMeta({ ...meta, currentEnd: e.target.value })}
                className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveMeta}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-chimera-gold text-black text-sm font-medium rounded-lg hover:bg-white transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-chimera-dark border border-chimera-border rounded-xl p-5">
          <div className="text-xs text-chimera-text-muted uppercase tracking-wider mb-3">Progress</div>
          <div className="font-display text-2xl mb-2">{project.progress}%</div>
          <div className="h-1.5 bg-chimera-surface rounded-full overflow-hidden">
            <div className="h-full bg-chimera-gold rounded-full" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="bg-chimera-dark border border-chimera-border rounded-xl p-5">
          <div className="text-xs text-chimera-text-muted uppercase tracking-wider mb-3">Budget</div>
          <div className="font-display text-2xl mb-1">{fmt(project.budget.allocated)}</div>
          <div className="text-xs text-chimera-text-muted">{fmt(project.budget.spent)} spent</div>
        </div>
        <div className="bg-chimera-dark border border-chimera-border rounded-xl p-5">
          <div className="text-xs text-chimera-text-muted uppercase tracking-wider mb-3">Schedule</div>
          <div className="font-display text-2xl mb-1">{project.schedule.currentEnd}</div>
          {project.schedule.daysVariance !== 0 && (
            <div className={`text-xs ${project.schedule.daysVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {project.schedule.daysVariance > 0 ? '+' : ''}{project.schedule.daysVariance} days
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Milestones — wider */}
        <div className="col-span-3 bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-chimera-border flex items-center justify-between">
            <h2 className="text-sm font-medium">Milestones</h2>
            <span className="text-xs text-chimera-text-muted">
              {project.milestones.filter((m) => m.completed).length}/{project.milestones.length} done
            </span>
          </div>
          <div className="divide-y divide-chimera-border">
            {project.milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3 group">
                <button
                  onClick={() => toggleMilestone(m)}
                  className={`shrink-0 ${m.completed ? 'text-chimera-gold' : 'text-chimera-text-muted hover:text-white'} transition`}
                >
                  {m.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${m.completed ? 'line-through text-chimera-text-muted' : ''}`}>{m.title}</div>
                  <div className="text-xs text-chimera-text-muted mt-0.5">{m.dueDate}</div>
                </div>
                <button
                  onClick={() => deleteMilestone(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-chimera-text-muted hover:text-red-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          {/* Add milestone */}
          <form onSubmit={addMilestone} className="px-5 py-3 border-t border-chimera-border flex gap-2">
            <input
              value={newMilestone.title}
              onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
              placeholder="New milestone…"
              className="flex-1 bg-transparent text-sm placeholder:text-chimera-text-muted focus:outline-none"
            />
            <input
              type="date"
              value={newMilestone.dueDate}
              onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
              className="bg-chimera-surface border border-chimera-border rounded px-2 py-1 text-xs focus:outline-none focus:border-chimera-gold"
            />
            <button
              type="submit"
              disabled={addingMilestone || !newMilestone.title || !newMilestone.dueDate}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-chimera-gold text-black rounded font-medium hover:bg-white transition disabled:opacity-40"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </form>
        </div>

        {/* Activity feed */}
        <div className="col-span-2 bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-chimera-border">
            <h2 className="text-sm font-medium">Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-chimera-border max-h-72">
            {project.activity.length === 0 ? (
              <div className="px-5 py-6 text-xs text-chimera-text-muted text-center">No activity yet</div>
            ) : (
              project.activity.map((a) => {
                const Icon = activityIcons[a.type];
                return (
                  <div key={a.id} className="flex items-start gap-2.5 px-5 py-3">
                    <Icon className="w-3.5 h-3.5 text-chimera-text-muted mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs">{a.message}</div>
                      <div className="text-xs text-chimera-text-muted mt-0.5">
                        {new Date(a.timestamp).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={postActivity} className="px-4 py-3 border-t border-chimera-border space-y-2">
            <div className="flex gap-2">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as Activity['type'])}
                className="bg-chimera-surface border border-chimera-border rounded px-2 py-1.5 text-xs focus:outline-none"
              >
                <option value="note">Note</option>
                <option value="milestone">Milestone</option>
                <option value="document">Document</option>
                <option value="budget">Budget</option>
              </select>
              <input
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                placeholder="Add an activity note…"
                className="flex-1 bg-chimera-surface border border-chimera-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-chimera-gold transition"
              />
            </div>
            <button
              type="submit"
              disabled={postingActivity || !activityNote.trim()}
              className="w-full py-1.5 text-xs bg-chimera-surface border border-chimera-border rounded hover:border-chimera-gold/50 transition disabled:opacity-40"
            >
              {postingActivity ? 'Posting…' : '+ Post Activity'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
