import { requireAdminAuth } from '@/lib/admin-auth';
import { getProjectById } from '@/lib/project-store';
import { getAllClients } from '@/lib/client-store';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminProjectEditor from '@/components/admin/AdminProjectEditor';

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const { id } = await params;
  const [project, clients] = await Promise.all([getProjectById(id), getAllClients()]);
  if (!project) notFound();

  return (
    <div className="p-8">
      <Link
        href="/admin/projects"
        className="flex items-center gap-1.5 text-sm text-chimera-text-muted hover:text-white transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <AdminProjectEditor
        project={project}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
