import { requireAdminAuth } from '@/lib/admin-auth';
import { getThreadSummaries } from '@/lib/portal-messages';
import { getAllClients } from '@/lib/client-store';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ChevronRight } from 'lucide-react';

export default async function AdminMessagesPage() {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const [summaries, clients] = await Promise.all([getThreadSummaries(), getAllClients()]);
  const clientMap = new Map(clients.map((c) => [c.id, { name: c.name, email: c.email }]));

  const sorted = [...summaries].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight mb-1">Messages</h1>
        <p className="text-sm text-chimera-text-muted">{summaries.length} active threads</p>
      </div>

      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">All Threads</h2>
        </div>
        {sorted.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-chimera-text-muted">
            No message threads yet.
          </div>
        ) : (
          <div className="divide-y divide-chimera-border">
            {sorted.map((s) => {
              const client = clientMap.get(s.clientId);
              return (
                <Link
                  key={s.clientId}
                  href={`/admin/messages/${s.clientId}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-chimera-surface/30 transition group"
                >
                  <div className="w-9 h-9 rounded-full bg-chimera-surface border border-chimera-border flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-chimera-gold">
                      {(client?.name ?? '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{client?.name ?? s.clientId}</div>
                    <div className="text-xs text-chimera-text-muted mt-0.5 truncate">{s.lastMessage}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-chimera-text-muted">
                      {new Date(s.lastMessageAt).toLocaleDateString('en-CA')}
                    </span>
                    <span className="text-xs text-chimera-text-muted">{s.messageCount} msgs</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-chimera-text-muted group-hover:text-white transition" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
