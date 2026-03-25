import { requireAdminAuth } from '@/lib/admin-auth';
import { findClientById } from '@/lib/client-store';
import { getProjectsByClient } from '@/lib/project-store';
import { getInvoicesByClient } from '@/lib/invoice-store';
import { getPortalMessages } from '@/lib/portal-messages';
import { getAgentMemoryForClient } from '@/lib/portal-agent-memory';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FolderKanban, FileText, MessageSquare, Phone, Mail, Calendar } from 'lucide-react';
import AdminClientMemoryViewer from '@/components/admin/AdminClientMemoryViewer';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const { id } = await params;
  const client = await findClientById(id);
  if (!client) notFound();

  const [projects, invoices, messages, memoryEntries] = await Promise.all([
    getProjectsByClient(id),
    getInvoicesByClient(id),
    getPortalMessages(id),
    getAgentMemoryForClient(id, 100),
  ]);

  const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-8">
      <Link
        href="/admin/clients"
        className="flex items-center gap-1.5 text-sm text-chimera-text-muted hover:text-white transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-14 h-14 rounded-full bg-chimera-surface border border-chimera-border flex items-center justify-center shrink-0">
          <span className="font-display text-xl text-chimera-gold">{client.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-1">{client.name}</h1>
          <div className="flex items-center gap-4 text-sm text-chimera-text-muted">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</span>
            {client.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone}</span>}
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {new Date(client.createdAt).toLocaleDateString('en-CA')}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Projects', value: String(projects.length), icon: FolderKanban },
          { label: 'Outstanding', value: fmt(outstanding), icon: FileText },
          { label: 'Messages', value: String(messages.length), icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-chimera-dark border border-chimera-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-chimera-text-muted uppercase tracking-wider">{label}</span>
              <Icon className="w-4 h-4 text-chimera-gold" />
            </div>
            <div className="font-display text-2xl tracking-tight">{value}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-chimera-gold" />
            <h2 className="text-sm font-medium">Projects</h2>
          </div>
          <Link
            href="/admin/projects"
            className="text-xs text-chimera-text-muted hover:text-chimera-gold transition"
          >
            Manage all →
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="px-6 py-8 text-sm text-chimera-text-muted text-center">No projects assigned</div>
        ) : (
          <div className="divide-y divide-chimera-border">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/projects/${p.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-chimera-surface/30 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-chimera-text-muted mt-0.5">{p.status} · {p.progress}% complete</div>
                </div>
                <div className="text-sm text-chimera-text-muted">{fmt(p.budget.allocated)}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  p.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : p.status === 'planning' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                  : 'border-chimera-border text-chimera-text-muted'
                }`}>{p.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">Invoices</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="px-6 py-8 text-sm text-chimera-text-muted text-center">No invoices</div>
        ) : (
          <div className="divide-y divide-chimera-border">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{inv.number}</div>
                  <div className="text-xs text-chimera-text-muted mt-0.5">{inv.projectName} · Due {inv.dueDate}</div>
                </div>
                <div className="text-sm font-medium">{fmt(inv.total)}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  inv.status === 'paid' ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : inv.status === 'overdue' ? 'border-red-500/30 text-red-400 bg-red-500/10'
                  : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                }`}>{inv.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages link */}
      <Link
        href={`/admin/messages/${id}`}
        className="flex items-center justify-between bg-chimera-dark border border-chimera-border rounded-xl px-6 py-4 hover:border-chimera-gold/50 transition mb-6"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-chimera-gold" />
          <span className="text-sm font-medium">View Message Thread</span>
          <span className="text-xs text-chimera-text-muted">({messages.length} messages)</span>
        </div>
        <ArrowLeft className="w-4 h-4 text-chimera-text-muted rotate-180" />
      </Link>

      {/* Agent memory */}
      <AdminClientMemoryViewer clientId={id} initialEntries={memoryEntries} />
    </div>
  );
}
