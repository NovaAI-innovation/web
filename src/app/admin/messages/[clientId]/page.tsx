import { requireAdminAuth } from '@/lib/admin-auth';
import { getPortalMessages } from '@/lib/portal-messages';
import { findClientById } from '@/lib/client-store';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminMessageThread from '@/components/admin/AdminMessageThread';

export default async function AdminMessageThreadPage({ params }: { params: Promise<{ clientId: string }> }) {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const { clientId } = await params;
  const [messages, client] = await Promise.all([
    getPortalMessages(clientId),
    findClientById(clientId),
  ]);

  return (
    <div className="p-8 flex flex-col h-screen">
      <Link
        href="/admin/messages"
        className="flex items-center gap-1.5 text-sm text-chimera-text-muted hover:text-white transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Messages
      </Link>

      <div className="mb-4">
        <h1 className="font-display text-2xl tracking-tight">
          {client ? client.name : clientId}
        </h1>
        {client && <p className="text-sm text-chimera-text-muted">{client.email}</p>}
      </div>

      <AdminMessageThread
        clientId={clientId}
        initialMessages={messages}
      />
    </div>
  );
}
