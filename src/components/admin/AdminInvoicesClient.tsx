'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Invoice } from '@/lib/invoice-store';
import { FileText, Check, X } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

function StatusPill({ status }: { status: Invoice['status'] }) {
  const cls =
    status === 'paid' ? 'border-green-500/30 text-green-400 bg-green-500/10'
    : status === 'overdue' ? 'border-red-500/30 text-red-400 bg-red-500/10'
    : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{status}</span>;
}

export default function AdminInvoicesClient({
  invoices: initial,
  clientMap,
}: {
  invoices: Invoice[];
  clientMap: Record<string, string>;
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Invoice['status']>('pending');
  const [editPaidDate, setEditPaidDate] = useState('');
  const [editClientId, setEditClientId] = useState('');

  const startEdit = (inv: Invoice) => {
    setEditingId(inv.id);
    setEditStatus(inv.status);
    setEditPaidDate(inv.paidDate ?? '');
    setEditClientId(inv.clientId ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const res = await fetch(`/api/admin/invoices/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: editStatus,
        paidDate: editPaidDate || undefined,
        clientId: editClientId || undefined,
      }),
    });
    const payload = await res.json() as { data: Invoice | null };
    if (payload.data) {
      setInvoices((prev) => prev.map((i) => i.id === editingId ? payload.data! : i));
    }
    setEditingId(null);
    router.refresh();
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  };

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Invoiced', value: fmt(invoices.reduce((s, i) => s + i.total, 0)) },
          { label: 'Collected', value: fmt(totalPaid) },
          { label: 'Outstanding', value: fmt(totalOutstanding) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-chimera-dark border border-chimera-border rounded-xl p-5">
            <div className="text-xs text-chimera-text-muted uppercase tracking-wider mb-2">{label}</div>
            <div className="font-display text-2xl">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">All Invoices</h2>
        </div>
        <div className="divide-y divide-chimera-border">
          {invoices.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-chimera-text-muted">No invoices yet.</div>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="px-6 py-4">
                {editingId === inv.id ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{inv.number}</div>
                      <div className="text-xs text-chimera-text-muted">{inv.projectName}</div>
                    </div>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as Invoice['status'])}
                      className="bg-chimera-surface border border-chimera-border rounded px-2 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="overdue">overdue</option>
                    </select>
                    {editStatus === 'paid' && (
                      <input
                        type="date"
                        value={editPaidDate}
                        onChange={(e) => setEditPaidDate(e.target.value)}
                        className="bg-chimera-surface border border-chimera-border rounded px-2 py-1.5 text-xs focus:outline-none"
                        placeholder="Paid date"
                      />
                    )}
                    <button onClick={saveEdit} className="text-green-400 hover:text-green-300 transition">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-chimera-text-muted hover:text-white transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 group">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{inv.number}</div>
                      <div className="text-xs text-chimera-text-muted mt-0.5">
                        {inv.projectName}
                        {inv.clientId && clientMap[inv.clientId] && ` · ${clientMap[inv.clientId]}`}
                      </div>
                    </div>
                    <div className="text-xs text-chimera-text-muted">Due {inv.dueDate}</div>
                    <div className="text-sm font-medium">{fmt(inv.total)}</div>
                    <StatusPill status={inv.status} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => startEdit(inv)}
                        className="text-xs text-chimera-text-muted hover:text-white px-2 py-1 rounded border border-chimera-border hover:border-white/30 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/10 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
