import { requireAdminAuth } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { getAllClients } from '@/lib/client-store';
import { getAllProjects } from '@/lib/project-store';
import SchematicGenerator from '@/components/admin/SchematicGenerator';

export default async function SchematicsPage() {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const [clients, allProjects] = await Promise.all([getAllClients(), getAllProjects()]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight mb-1">Schematic Generator</h1>
        <p className="text-sm text-chimera-text-muted">
          Upload a hand-drawn or drafted schematic to generate a clean professional drawing
        </p>
      </div>
      <SchematicGenerator
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        projects={allProjects.map((p) => ({ id: p.id, name: p.name, clientId: p.clientId }))}
      />
    </div>
  );
}
