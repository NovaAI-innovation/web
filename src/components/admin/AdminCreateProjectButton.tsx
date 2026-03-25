'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Client = { id: string; name: string };

export default function AdminCreateProjectButton({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    clientId: '',
    status: 'planning' as const,
    budgetAllocated: '',
    baselineEnd: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        clientId: form.clientId || undefined,
        status: form.status,
        progress: 0,
        budget: { allocated: Number(form.budgetAllocated) || 0, spent: 0 },
        schedule: {
          baselineEnd: form.baselineEnd,
          currentEnd: form.baselineEnd,
          daysVariance: 0,
        },
        milestones: [],
        activity: [],
      }),
    });

    const payload = await res.json() as { data: { id: string } | null; error: { message: string } | null };

    if (!res.ok || payload.error) {
      setError(payload.error?.message ?? 'Failed to create project');
      setLoading(false);
      return;
    }

    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-chimera-gold text-black text-sm font-medium rounded-lg hover:bg-white transition"
      >
        <Plus className="w-4 h-4" /> New Project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-chimera-dark border border-chimera-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl">New Project</h2>
              <button onClick={() => setOpen(false)} className="text-chimera-text-muted hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-chimera-text-muted mb-1.5">Project Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
                  placeholder="e.g. Master Bathroom Renovation"
                />
              </div>

              <div>
                <label className="block text-xs text-chimera-text-muted mb-1.5">Assign to Client</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
                >
                  <option value="">Unassigned</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-chimera-text-muted mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'planning' })}
                    className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-chimera-text-muted mb-1.5">Budget (CAD)</label>
                  <input
                    type="number"
                    value={form.budgetAllocated}
                    onChange={(e) => setForm({ ...form, budgetAllocated: e.target.value })}
                    className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-chimera-text-muted mb-1.5">Target End Date *</label>
                <input
                  type="date"
                  value={form.baselineEnd}
                  onChange={(e) => setForm({ ...form, baselineEnd: e.target.value })}
                  required
                  className="w-full bg-chimera-surface border border-chimera-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-chimera-gold transition"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 text-sm border border-chimera-border rounded-lg hover:border-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm bg-chimera-gold text-black font-medium rounded-lg hover:bg-white transition disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
