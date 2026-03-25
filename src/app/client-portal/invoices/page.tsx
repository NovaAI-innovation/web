import { cookies } from 'next/headers';
import { parseToken, findClientById } from '@/lib/client-store';
import { getInvoiceSummaryByClient } from '@/lib/invoice-store';
import type { InvoiceStatus } from '@/lib/invoice-store';

const statusConfig: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  paid: { label: 'PAID', color: 'text-green-400', bg: 'bg-green-500/10' },
  pending: { label: 'PENDING', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  overdue: { label: 'OVERDUE', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default async function InvoicesPage() {
  let clientId = '';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('portalToken')?.value;
    if (token) {
      const parsed = parseToken(token);
      if (parsed) {
        const client = await findClientById(parsed.clientId);
        if (client) clientId = client.id;
      }
    }
  } catch { /* fallback to empty */ }

  const summary = await getInvoiceSummaryByClient(clientId);

  return (
    <div className="min-h-screen bg-chimera-black p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <div className="text-chimera-gold text-sm tracking-widest mb-2">BILLING</div>
          <h1 className="font-display text-6xl tracking-tighter">Invoices</h1>
          <p className="text-chimera-text-muted mt-3">View and track all project invoices and payments.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="glass rounded-xl p-8">
            <div className="text-xs text-chimera-text-muted mb-2">TOTAL INVOICES</div>
            <div className="text-4xl font-display text-chimera-gold tabular-nums">{summary.totalInvoices}</div>
          </div>
          <div className="glass rounded-xl p-8">
            <div className="text-xs text-chimera-text-muted mb-2">TOTAL PAID</div>
            <div className="text-3xl font-display text-green-400 tabular-nums">${summary.totalPaid.toLocaleString()}</div>
          </div>
          <div className="glass rounded-xl p-8">
            <div className="text-xs text-chimera-text-muted mb-2">OUTSTANDING</div>
            <div className="text-3xl font-display text-yellow-400 tabular-nums">${summary.totalOutstanding.toLocaleString()}</div>
          </div>
          <div className="glass rounded-xl p-8">
            <div className="text-xs text-chimera-text-muted mb-2">OVERDUE</div>
            <div className="text-4xl font-display text-red-400 tabular-nums">{summary.overdueCount}</div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="space-y-4">
          {summary.invoices
            .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())
            .map((invoice) => {
              const status = statusConfig[invoice.status];

              return (
                <div key={invoice.id} className="glass rounded-xl p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="font-display text-2xl">{invoice.number}</div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${status.color} ${status.bg}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-display text-chimera-gold tabular-nums">
                        ${invoice.total.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-chimera-text-muted mb-6">{invoice.projectName}</div>

                  {/* Line Items */}
                  <div className="border-t border-chimera-border pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-chimera-text-muted uppercase tracking-wider">
                          <th className="text-left pb-3 font-medium">Description</th>
                          <th className="text-right pb-3 font-medium">Qty</th>
                          <th className="text-right pb-3 font-medium">Unit Price</th>
                          <th className="text-right pb-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.lineItems.map((item, idx) => (
                          <tr key={idx} className="border-t border-chimera-border/50">
                            <td className="py-3 text-white">{item.description}</td>
                            <td className="py-3 text-right text-chimera-text-muted tabular-nums">{item.quantity}</td>
                            <td className="py-3 text-right text-chimera-text-muted tabular-nums">${item.unitPrice.toLocaleString()}</td>
                            <td className="py-3 text-right text-white tabular-nums">${item.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-chimera-border">
                          <td colSpan={3} className="py-2 text-right text-xs text-chimera-text-muted">Subtotal</td>
                          <td className="py-2 text-right tabular-nums">${invoice.subtotal.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="py-1 text-right text-xs text-chimera-text-muted">Tax (5%)</td>
                          <td className="py-1 text-right text-chimera-text-muted tabular-nums">${invoice.tax.toLocaleString()}</td>
                        </tr>
                        <tr className="border-t border-chimera-border">
                          <td colSpan={3} className="py-3 text-right text-xs text-chimera-gold font-medium">TOTAL</td>
                          <td className="py-3 text-right font-display text-lg text-chimera-gold tabular-nums">${invoice.total.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Dates */}
                  <div className="flex gap-8 mt-4 text-xs text-chimera-text-muted">
                    <div>Issued: {invoice.issuedDate}</div>
                    <div>Due: {invoice.dueDate}</div>
                    {invoice.paidDate && <div className="text-green-400">Paid: {invoice.paidDate}</div>}
                  </div>
                </div>
              );
            })}
        </div>

        {summary.invoices.length === 0 && (
          <div className="text-center py-20 text-chimera-text-muted">
            No invoices yet.
          </div>
        )}
      </div>
    </div>
  );
}
