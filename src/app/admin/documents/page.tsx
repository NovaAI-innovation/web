import { requireAdminAuth } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import AdminDocumentsClient from '@/components/admin/AdminDocumentsClient';
import { getAllClients } from '@/lib/client-store';
import { getAllProjects } from '@/lib/project-store';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { getDocumentMeta, getDocumentSource } from '@/lib/document-source';

async function getContractorDocs() {
  const uploadsDir = resolve(join(process.cwd(), '.data', 'uploads'));
  try {
    const files = await readdir(uploadsDir);
    const docs = await Promise.all(
      files.map(async (filename) => {
        const source = getDocumentSource(filename);
        const meta = getDocumentMeta(filename);
        const fileStat = await stat(join(uploadsDir, filename)).catch(() => null);
        return {
          filename,
          source,
          size: fileStat?.size ?? 0,
          uploadedAt: fileStat ? new Date(fileStat.mtime).toISOString() : '',
          originalName: filename.replace(/^\d+-/, ''),
          projectId: meta?.projectId,
        };
      }),
    );
    return docs.filter((d) => d.source === 'contractor');
  } catch {
    return [];
  }
}

export default async function AdminDocumentsPage() {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const [docs, clients, allProjects] = await Promise.all([getContractorDocs(), getAllClients(), getAllProjects()]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight mb-1">Documents</h1>
        <p className="text-sm text-chimera-text-muted">
          Contractor documents available to the portal agent · {docs.length} files
        </p>
      </div>

      <AdminDocumentsClient
        initialDocs={docs}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        projects={allProjects.map((p) => ({ id: p.id, name: p.name, clientId: p.clientId }))}
      />
    </div>
  );
}
