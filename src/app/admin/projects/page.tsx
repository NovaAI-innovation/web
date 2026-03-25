import { requireAdminAuth } from '@/lib/admin-auth';
import { getAllProjects } from '@/lib/project-store';
import { getAllClients } from '@/lib/client-store';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FolderKanban, ChevronRight } from 'lucide-react';
import AdminCreateProjectButton from '@/components/admin/AdminCreateProjectButton';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

export default async function AdminProjectsPage() {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const [projects, clients] = await Promise.all([getAllProjects(), getAllClients()]);
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-1">Projects</h1>
          <p className="text-sm text-chimera-text-muted">{projects.length} total</p>
        </div>
        <AdminCreateProjectButton clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">All Projects</h2>
        </div>
        {projects.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-chimera-text-muted">
            No projects yet. Create one to get started.
          </div>
        ) : (
          <div className="divide-y divide-chimera-border">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/projects/${p.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-chimera-surface/30 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-chimera-text-muted mt-0.5">
                    {p.clientId ? (clientMap.get(p.clientId) ?? p.clientId) : 'Unassigned'}
                    {' · '}Due {p.schedule.currentEnd}
                  </div>
                </div>
                <div className="w-28">
                  <div className="h-1.5 bg-chimera-surface rounded-full overflow-hidden">
                    <div className="h-full bg-chimera-gold rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div className="text-xs text-chimera-text-muted mt-1 text-right">{p.progress}%</div>
                </div>
                <div className="text-sm text-chimera-text-muted w-24 text-right">{fmt(p.budget.allocated)}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full border w-16 text-center ${
                  p.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : p.status === 'planning' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                  : 'border-chimera-border text-chimera-text-muted'
                }`}>{p.status}</span>
                <ChevronRight className="w-4 h-4 text-chimera-text-muted group-hover:text-white transition" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
