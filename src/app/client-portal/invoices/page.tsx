'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  PaymentHistoryChart,
  InvoiceStatusDonut,
  Sparkline,
} from '@/components/visualizations';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  projectName: string;
  status: 'paid' | 'pending' | 'overdue';
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: LineItem[];
}

interface InvoiceSummary {
  totalInvoices: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  invoices: Invoice[];
}

type FilterStatus = 'all' | 'paid' | 'pending' | 'overdue';

const statusConfig = {
  paid: {
    label: 'PAID',
    color: 'var(--color-green)',
    bgColor: 'rgba(22, 163, 74, 0.15)',
    icon: CheckCircle2,
  },
  pending: {
    label: 'PENDING',
    color: 'var(--accent)',
    bgColor: 'rgba(212, 161, 54, 0.15)',
    icon: Clock,
  },
  overdue: {
    label: 'OVERDUE',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: AlertCircle,
  },
};

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
    paid: Math.round((totals.paid / 6) * 0.7),
    pending: Math.round((totals.pending / 6) * 0.8),
    overdue: Math.round((totals.overdue / 6) * 0.9),
  }));
};

export default function InvoicesPage() {
  const [data, setData] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/client-portal/invoices')
      .then((res) => res.json())
      .then((response) => {
        if (response.data) {
          setData(response.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const summary = data || {
    totalInvoices: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
    invoices: [],
  };

  const statusCounts = useMemo(
    () => ({
      paid: summary.invoices.filter((i) => i.status === 'paid').length,
      pending: summary.invoices.filter((i) => i.status === 'pending').length,
      overdue: summary.invoices.filter((i) => i.status === 'overdue').length,
    }),
    [summary.invoices],
  );

  const filteredInvoices = useMemo(
    () =>
      [...summary.invoices]
        .filter((inv) => (filter === 'all' ? true : inv.status === filter))
        .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()),
    [filter, summary.invoices],
  );

  const paymentData = useMemo(() => generatePaymentHistory(summary.invoices), [summary.invoices]);

  if (loading) {
    return (
      <div className="min-h-screen bg-chimera-black p-10">
        <div className="max-w-6xl mx-auto animate-pulse space-y-8">
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chimera-black p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-chimera-gold text-sm tracking-widest mb-2">BILLING</div>
          <h1 className="font-display text-5xl lg:text-6xl tracking-tighter mb-3">Invoices</h1>
          <p className="text-chimera-text-muted max-w-xl">
            View and track all project invoices and payments. Download PDFs or pay outstanding invoices online.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-6"
          >
            <div className="text-xs text-chimera-text-muted mb-2 uppercase tracking-wider">Total Invoices</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display text-white">{summary.totalInvoices}</span>
              <Sparkline data={[40, 45, 42, 48, 50, summary.totalInvoices * 10]} width={60} height={24} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-6"
          >
            <div className="text-xs text-chimera-text-muted mb-2 uppercase tracking-wider">Total Paid</div>
            <div className="text-3xl font-display text-green-400">${summary.totalPaid.toLocaleString()}</div>
            <div className="text-xs text-green-400/70 mt-1">+12% vs last month</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-6"
          >
            <div className="text-xs text-chimera-text-muted mb-2 uppercase tracking-wider">Outstanding</div>
            <div className="text-3xl font-display text-yellow-400">${summary.totalOutstanding.toLocaleString()}</div>
            <div className="text-xs text-yellow-400/70 mt-1">
              {summary.overdueCount > 0 ? `${summary.overdueCount} overdue` : 'All current'}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-6"
          >
            <div className="text-xs text-chimera-text-muted mb-2 uppercase tracking-wider">Next Payment Due</div>
            <div className="text-2xl font-display text-white">$12,500</div>
            <div className="flex items-center gap-2 text-xs text-chimera-text-muted mt-1">
              <Calendar className="w-3 h-3" />
              Due Apr 15, 2024
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-chimera-text-muted">
                Payment History
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-500">+18%</span>
                <span className="text-chimera-text-muted">vs last quarter</span>
              </div>
            </div>
            <PaymentHistoryChart data={paymentData} height={240} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-sm font-medium uppercase tracking-wider text-chimera-text-muted mb-4">
              Invoice Status
            </h2>
            <InvoiceStatusDonut
              paid={statusCounts.paid}
              pending={statusCounts.pending}
              overdue={statusCounts.overdue}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {(['all', 'paid', 'pending', 'overdue'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === status
                  ? 'bg-chimera-gold text-black'
                  : 'glass text-chimera-text-muted hover:text-white'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && <span className="ml-2 text-xs opacity-70">({statusCounts[status]})</span>}
            </button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredInvoices.map((invoice, index) => {
              const status = statusConfig[invoice.status];
              const StatusIcon = status.icon;
              const isExpanded = expandedInvoice === invoice.id;

              return (
                <motion.div
                  key={invoice.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedInvoice(isExpanded ? null : invoice.id)}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: status.bgColor }}
                      >
                        <StatusIcon className="w-6 h-6" style={{ color: status.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-display text-xl">{invoice.number}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: status.bgColor, color: status.color }}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-chimera-text-muted mt-1">{invoice.projectName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-3xl font-display text-white">${invoice.total.toLocaleString()}</div>
                        <div className="text-xs text-chimera-text-muted">Issued {invoice.issuedDate}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invoice.status === 'pending' && (
                          <button className="px-4 py-2 bg-chimera-gold text-black rounded-lg text-sm font-medium hover:bg-white transition-colors flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Pay Now
                          </button>
                        )}
                        <button className="p-2 glass rounded-lg hover:border-chimera-gold/50 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="p-2">
                          <ChevronDown className="w-5 h-5 text-chimera-text-muted" />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-chimera-border overflow-hidden"
                      >
                        <div className="p-6">
                          <table className="w-full text-sm mb-6">
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
                                  <td className="py-3 text-right text-white tabular-nums font-medium">${item.total.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div className="flex justify-end">
                            <div className="w-full max-w-xs space-y-2 text-sm">
                              <div className="flex justify-between text-chimera-text-muted">
                                <span>Subtotal</span>
                                <span>${invoice.subtotal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-chimera-text-muted">
                                <span>Tax (5%)</span>
                                <span>${invoice.tax.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-lg font-display text-chimera-gold pt-2 border-t border-chimera-border">
                                <span>TOTAL</span>
                                <span>${invoice.total.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-8 mt-6 pt-6 border-t border-chimera-border text-sm">
                            <div className="flex items-center gap-2 text-chimera-text-muted">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Issued: <span className="text-white">{invoice.issuedDate}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-chimera-text-muted">
                              <Clock className="w-4 h-4" />
                              <span>
                                Due: <span className="text-white">{invoice.dueDate}</span>
                              </span>
                            </div>
                            {invoice.paidDate && (
                              <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Paid: {invoice.paidDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredInvoices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 glass rounded-2xl"
            >
              <FileText className="w-16 h-16 mx-auto mb-4 text-chimera-text-muted" />
              <h3 className="text-xl font-medium mb-2">No invoices found</h3>
              <p className="text-chimera-text-muted">
                {filter === 'all' ? "You don't have any invoices yet." : `No ${filter} invoices at this time.`}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
