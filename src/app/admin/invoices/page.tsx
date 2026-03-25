import { requireAdminAuth } from '@/lib/admin-auth';
import { getAllInvoices } from '@/lib/invoice-store';
import { getAllClients } from '@/lib/client-store';
import { redirect } from 'next/navigation';
import AdminInvoicesClient from '@/components/admin/AdminInvoicesClient';

export default async function AdminInvoicesPage() {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const [invoices, clients] = await Promise.all([getAllInvoices(), getAllClients()]);
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight mb-1">Invoices</h1>
        <p className="text-sm text-chimera-text-muted">{invoices.length} total</p>
      </div>

      <AdminInvoicesClient
        invoices={invoices}
        clientMap={Object.fromEntries(clientMap)}
      />
    </div>
  );
}
