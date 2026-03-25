import { requireAdminAuth } from '@/lib/admin-auth';
import { getAllClients } from '@/lib/client-store';
import { getProjectsByClient } from '@/lib/project-store';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, ChevronRight, FolderKanban } from 'lucide-react';

export default async function AdminClientsPage() {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const clients = await getAllClients();

  const withMeta = await Promise.all(
    clients.map(async (c) => {
      const projects = await getProjectsByClient(c.id);
      return {
        ...c,
        projectCount: projects.length,
        activeCount: projects.filter((p) => p.status === 'active').length,
      };
    }),
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-1">Clients</h1>
          <p className="text-sm text-chimera-text-muted">{clients.length} registered</p>
        </div>
      </div>

      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
          <Users className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">All Clients</h2>
        </div>

        {withMeta.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-chimera-text-muted">
            No clients have registered yet.
          </div>
        ) : (
          <div className="divide-y divide-chimera-border">
            {withMeta.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-chimera-surface/30 transition group"
              >
                <div className="w-9 h-9 rounded-full bg-chimera-surface border border-chimera-border flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-chimera-gold">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-chimera-text-muted mt-0.5">{c.email}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-chimera-text-muted">
                  <span className="flex items-center gap-1">
                    <FolderKanban className="w-3 h-3" />
                    {c.projectCount} project{c.projectCount !== 1 ? 's' : ''}
                    {c.activeCount > 0 && (
                      <span className="ml-1 text-green-400">({c.activeCount} active)</span>
                    )}
                  </span>
                  <span>Joined {new Date(c.createdAt).toLocaleDateString('en-CA')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-chimera-text-muted group-hover:text-white transition" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
