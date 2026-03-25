import { getAllProjects } from '@/lib/project-store';
import { getAllInvoices } from '@/lib/invoice-store';
import { requireAdminAuth } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import {
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const auth = await requireAdminAuth();
  if (!auth.ok) redirect('/admin');

  const [projects, invoices] = await Promise.all([getAllProjects(), getAllInvoices()]);

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const totalBudget = projects.reduce((s, p) => s + p.budget.allocated, 0);
  const totalSpent = projects.reduce((s, p) => s + p.budget.spent, 0);
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const pendingRevenue = pendingInvoices.reduce((s, i) => s + i.total, 0);
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

  const stats = [
    {
      label: 'Active Projects',
      value: String(activeProjects),
      sub: `${projects.length} total`,
      icon: FolderKanban,
      color: 'text-blue-400',
    },
    {
      label: 'Budget Allocated',
      value: fmt(totalBudget),
      sub: `${fmt(totalSpent)} spent`,
      icon: DollarSign,
      color: 'text-chimera-gold',
    },
    {
      label: 'Outstanding',
      value: fmt(pendingRevenue),
      sub: overdueCount > 0 ? `${overdueCount} overdue` : 'All current',
      icon: FileText,
      color: overdueCount > 0 ? 'text-red-400' : 'text-green-400',
    },
    {
      label: 'Budget Used',
      value: totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}%` : '—',
      sub: 'across all projects',
      icon: TrendingUp,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm text-chimera-text-muted">Overview of all active work</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-chimera-dark border border-chimera-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs text-chimera-text-muted uppercase tracking-wider">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="font-display text-2xl tracking-tight mb-1">{value}</div>
            <div className="text-xs text-chimera-text-muted">{sub}</div>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">Projects</h2>
        </div>
        <div className="divide-y divide-chimera-border">
          {projects.length === 0 ? (
            <div className="px-6 py-8 text-sm text-chimera-text-muted text-center">No projects yet</div>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-chimera-surface/30 transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-chimera-text-muted mt-0.5">
                    {p.clientId ?? 'Unassigned'} · Updated {new Date(p.updatedAt).toLocaleDateString('en-CA')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <div className="h-1.5 bg-chimera-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-chimera-gold rounded-full"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-chimera-text-muted mt-1 text-right">{p.progress}%</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      p.status === 'active'
                        ? 'border-green-500/30 text-green-400 bg-green-500/10'
                        : p.status === 'planning'
                        ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                        : 'border-chimera-border text-chimera-text-muted'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-chimera-dark border border-chimera-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-chimera-gold" />
          <h2 className="text-sm font-medium">Recent Invoices</h2>
        </div>
        <div className="divide-y divide-chimera-border">
          {invoices.length === 0 ? (
            <div className="px-6 py-8 text-sm text-chimera-text-muted text-center">No invoices yet</div>
          ) : (
            invoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{inv.number}</div>
                  <div className="text-xs text-chimera-text-muted mt-0.5">{inv.projectName}</div>
                </div>
                <div className="text-sm font-medium">{fmt(inv.total)}</div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    inv.status === 'paid'
                      ? 'border-green-500/30 text-green-400 bg-green-500/10'
                      : inv.status === 'overdue'
                      ? 'border-red-500/30 text-red-400 bg-red-500/10'
                      : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                  }`}
                >
                  {inv.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
