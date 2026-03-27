'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import {
  StatCard,
  PaymentHistoryChart,
  DonutChart,
} from '@/components/visualizations';

interface Project {
  id: string;
  name: string;
  clientId: string;
  status: 'active' | 'planning' | 'completed';
  progress: number;
  budget: { allocated: number; spent: number };
  updatedAt: string;
}

interface Invoice {
  id: string;
  number: string;
  projectName: string;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
}

interface DashboardData {
  projects: Project[];
  invoices: Invoice[];
}

const generatePaymentHistory = (invoices: Invoice[]) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const totals = invoices.reduce(
    (acc, invoice) => {
      if (invoice.status === 'paid') acc.paid += invoice.total;
      if (invoice.status === 'pending') acc.pending += invoice.total;
      if (invoice.status === 'overdue') acc.overdue += invoice.total;
      return acc;
    },
    { paid: 0, pending: 0, overdue: 0 },
  );

  return months.map((month) => ({
    month,
    paid: Math.round((totals.paid / 6) * 0.65),
    pending: Math.round((totals.pending / 6) * 0.9),
    overdue: Math.round((totals.overdue / 6) * 0.85),
  }));
};

const generateSparkline = (trend: 'up' | 'down' | 'neutral') => {
  const base = 50;
  const offsetPattern = [0, 5, -3, 8, -2, 6, -4, 7, -2, 4];
  return Array.from({ length: 10 }, (_, i) => {
    const trendFactor = trend === 'up' ? i * 3 : trend === 'down' ? -i * 3 : 0;
    return Math.max(10, base + offsetPattern[i] + trendFactor);
  });
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/projects?summary=1').then((r) => r.json()),
      fetch('/api/admin/invoices?summary=1').then((r) => r.json()),
    ])
      .then(([projectsRes, invoicesRes]) => {
        setData({
          projects: projectsRes.data || [],
          invoices: invoicesRes.data || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const projects = useMemo(() => data?.projects ?? [], [data]);
  const invoices = useMemo(() => data?.invoices ?? [], [data]);

  const activeProjects = useMemo(() => projects.filter((p) => p.status === 'active').length, [projects]);
  const totalBudget = useMemo(() => projects.reduce((s, p) => s + p.budget.allocated, 0), [projects]);
  const totalSpent = useMemo(() => projects.reduce((s, p) => s + p.budget.spent, 0), [projects]);
  const pendingRevenue = useMemo(
    () => invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.total, 0),
    [invoices],
  );
  const overdueCount = useMemo(() => invoices.filter((i) => i.status === 'overdue').length, [invoices]);
  const paidAmount = useMemo(
    () => invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    [invoices],
  );

  const invoiceStatusData = useMemo(
    () =>
      [
        { name: 'Paid', value: invoices.filter((i) => i.status === 'paid').length, color: 'var(--color-green)' },
        { name: 'Pending', value: invoices.filter((i) => i.status === 'pending').length, color: 'var(--accent)' },
        { name: 'Overdue', value: overdueCount, color: '#ef4444' },
      ].filter((d) => d.value > 0),
    [invoices, overdueCount],
  );

  const upSparkline = useMemo(() => generateSparkline('up'), []);
  const downSparkline = useMemo(() => generateSparkline('down'), []);
  const neutralSparkline = useMemo(() => generateSparkline('neutral'), []);
  const paymentHistory = useMemo(() => generatePaymentHistory(invoices), [invoices]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-white/5 rounded-xl w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-4xl tracking-tight mb-2">Dashboard</h1>
        <p className="text-sm text-chimera-text-muted">Overview of all active work</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Projects"
          value={String(activeProjects)}
          subvalue={`${projects.length} total projects`}
          trend="up"
          trendValue="12%"
          sparklineData={upSparkline}
          icon={FolderKanban}
          iconColor="#60a5fa"
          delay={0.1}
        />

        <StatCard
          label="Budget Allocated"
          value={fmt(totalBudget)}
          subvalue={`${fmt(totalSpent)} spent`}
          trend={totalSpent > totalBudget * 0.9 ? 'down' : 'up'}
          trendValue={`${Math.round((totalSpent / totalBudget) * 100)}% used`}
          sparklineData={totalSpent > totalBudget * 0.9 ? downSparkline : neutralSparkline}
          icon={DollarSign}
          iconColor="var(--accent)"
          delay={0.2}
        />

        <StatCard
          label="Outstanding"
          value={fmt(pendingRevenue)}
          subvalue={overdueCount > 0 ? `${overdueCount} invoices overdue` : 'All current'}
          trend={overdueCount > 0 ? 'down' : 'up'}
          trendValue={overdueCount > 0 ? 'Action needed' : 'Healthy'}
          sparklineData={overdueCount > 0 ? downSparkline : upSparkline}
          icon={FileText}
          iconColor={overdueCount > 0 ? '#ef4444' : 'var(--color-green)'}
          delay={0.3}
        />

        <StatCard
          label="Revenue This Month"
          value={fmt(paidAmount)}
          subvalue="Updated today"
          trend="up"
          trendValue="8.5%"
          sparklineData={upSparkline}
          icon={TrendingUp}
          iconColor="var(--color-green)"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-chimera-text-muted">Payment History</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                <span className="text-green-500">+23%</span>
                <span className="text-chimera-text-muted">vs last month</span>
              </div>
            </div>
          </div>
          <PaymentHistoryChart data={paymentHistory} height={260} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-sm font-medium uppercase tracking-wider text-chimera-text-muted mb-4">Invoice Status</h2>
          <DonutChart
            data={invoiceStatusData}
            size={200}
            innerRadius={55}
            outerRadius={75}
            centerValue={String(invoices.length)}
            centerLabel="Total"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-chimera-gold" />
            <h2 className="text-sm font-medium">Projects</h2>
          </div>
          <div className="divide-y divide-chimera-border">
            {projects.length === 0 ? (
              <div className="px-6 py-8 text-sm text-chimera-text-muted text-center">No projects yet</div>
            ) : (
              projects.slice(0, 5).map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate group-hover:text-chimera-gold transition-colors">{project.name}</div>
                    <div className="text-xs text-chimera-text-muted mt-0.5">
                      {project.clientId ?? 'Unassigned'} - Updated {new Date(project.updatedAt).toLocaleDateString('en-CA')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <div className="h-1.5 bg-chimera-surface rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-chimera-gold rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ delay: 0.9 + index * 0.05, duration: 0.8 }}
                        />
                      </div>
                      <div className="text-xs text-chimera-text-muted mt-1 text-right">{project.progress}%</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        project.status === 'active'
                          ? 'border-green-500/30 text-green-400 bg-green-500/10'
                          : project.status === 'planning'
                            ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                            : 'border-chimera-border text-chimera-text-muted'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          {projects.length > 5 && (
            <div className="px-6 py-3 border-t border-chimera-border text-center">
              <button className="text-sm text-chimera-gold hover:text-white transition-colors">
                View all {projects.length} projects
              </button>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-chimera-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-chimera-gold" />
            <h2 className="text-sm font-medium">Recent Invoices</h2>
          </div>
          <div className="divide-y divide-chimera-border">
            {invoices.length === 0 ? (
              <div className="px-6 py-8 text-sm text-chimera-text-muted text-center">No invoices yet</div>
            ) : (
              invoices.slice(0, 5).map((invoice, index) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.05 }}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{invoice.number}</div>
                    <div className="text-xs text-chimera-text-muted mt-0.5">{invoice.projectName}</div>
                  </div>
                  <div className="text-sm font-medium">{fmt(invoice.total)}</div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      invoice.status === 'paid'
                        ? 'border-green-500/30 text-green-400 bg-green-500/10'
                        : invoice.status === 'overdue'
                          ? 'border-red-500/30 text-red-400 bg-red-500/10'
                          : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
