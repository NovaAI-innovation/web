'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  DollarSign,
  StickyNote,
  Phone,
  Calendar,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  CircularProgress,
  BudgetBurnChart,
  ProjectTimeline,
  StatCard,
  BudgetStatCard,
} from '@/components/visualizations';

// Types matching the project-store
interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}

interface Budget {
  allocated: number;
  spent: number;
}

interface Schedule {
  baselineEnd: string;
  currentEnd: string;
  daysVariance: number;
}

interface Activity {
  id: string;
  type: 'milestone' | 'document' | 'budget' | 'note';
  message: string;
  timestamp: string;
}

interface Project {
  id: string;
  name: string;
  progress: number;
  milestones: Milestone[];
  budget: Budget;
  schedule: Schedule;
  activity: Activity[];
}

interface DashboardData {
  currentProject: Project | null;
  userName: string;
}

// Icon mapping with Lucide icons
const iconMap = {
  milestone: CheckCircle2,
  document: FileText,
  budget: DollarSign,
  note: StickyNote,
};

const colorMap = {
  milestone: { bg: 'rgba(22, 163, 74, 0.15)', text: 'var(--color-green)' },
  document: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
  budget: { bg: 'rgba(212, 161, 54, 0.15)', text: 'var(--accent)' },
  note: { bg: 'rgba(255, 255, 255, 0.08)', text: 'var(--text-muted)' },
};

const generateBudgetData = (budget: Budget) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const data = [];
  let accumulated = 0;
  const monthlyBase = budget.spent / months.length;

  for (let i = 0; i < months.length; i++) {
    const variance = i % 2 === 0 ? 0.92 : 1.08;
    const monthlySpend = i === months.length - 1
      ? budget.spent - accumulated
      : Math.floor(monthlyBase * variance);
    accumulated += monthlySpend;

    data.push({
      date: months[i],
      spent: accumulated,
      allocated: budget.allocated,
      projected: accumulated > budget.allocated * 0.9 ? accumulated + 5000 : undefined,
    });
  }
  return data;
};

const generateSparklineData = (trend: 'up' | 'down' | 'neutral') => {
  const base = 50;
  const offsetPattern = [0, 6, -4, 10, -2, 5, -6, 8, -3, 4, -5, 7];
  return Array.from({ length: 12 }, (_, i) => {
    const trendFactor = trend === 'up' ? i * 2 : trend === 'down' ? -i * 2 : 0;
    return Math.max(10, base + offsetPattern[i] + trendFactor);
  });
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data
    fetch('/api/client-portal/dashboard')
      .then(res => res.json())
      .then(response => {
        if (response.data) {
          setData(response.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const current = data?.currentProject;
  const userName = data?.userName || '';

  const currentMilestoneIndex = useMemo(
    () => current?.milestones.findIndex((m) => !m.completed) ?? -1,
    [current],
  );

  const timelineMilestones = useMemo(
    () =>
      current?.milestones.map((m, i) => ({
        id: m.id,
        title: m.title,
        date: m.dueDate,
        status: m.completed
          ? ('completed' as const)
          : i === currentMilestoneIndex
            ? ('current' as const)
            : ('upcoming' as const),
        description: m.completed ? 'Completed on schedule' : undefined,
      })) ?? [],
    [current, currentMilestoneIndex],
  );

  const budgetData = useMemo(
    () => (current ? generateBudgetData(current.budget) : []),
    [current],
  );

  const budgetSparkline = useMemo(
    () => generateSparklineData(current && current.budget.spent > current.budget.allocated * 0.8 ? 'up' : 'neutral'),
    [current],
  );

  const neutralSparkline = useMemo(() => generateSparklineData('neutral'), []);
  const upSparkline = useMemo(() => generateSparklineData('up'), []);

  const recentActivity = useMemo(
    () =>
      [...(current?.activity ?? [])]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8),
    [current],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-chimera-black p-10">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-20 bg-white/5 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="h-48 bg-white/5 rounded-xl" />
              <div className="h-48 bg-white/5 rounded-xl" />
              <div className="h-48 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chimera-black p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-12 gap-4"
        >
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-chimera-gold text-sm tracking-widest mb-2"
            >
              {userName ? `WELCOME BACK, ${userName.toUpperCase()}` : 'WELCOME BACK'}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-5xl lg:text-6xl tracking-tighter"
            >
              Project Dashboard
            </motion.h1>
          </div>

          {current && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-right glass rounded-xl p-4"
            >
              <div className="text-xs uppercase tracking-widest text-chimera-text-muted mb-1">
                Current Project
              </div>
              <div className="font-medium text-xl">{current.name}</div>
              <div className="flex items-center gap-2 mt-2 text-sm text-chimera-text-muted">
                <Calendar className="w-4 h-4" />
                <span>Started Jan 2024</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {current ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <BudgetStatCard
                allocated={current.budget.allocated}
                spent={current.budget.spent}
                sparklineData={budgetSparkline}
                delay={0.1}
              />

              <StatCard
                label="Days Remaining"
                value="45"
                subvalue="Projected completion: Apr 15"
                trend="neutral"
                trendValue="On track"
                sparklineData={neutralSparkline}
                icon={Clock}
                iconColor="var(--accent)"
                delay={0.2}
              />

              <StatCard
                label="Next Payment"
                value="$12,500"
                subvalue="Due in 5 days"
                trend="up"
                trendValue="12%"
                sparklineData={upSparkline}
                icon={DollarSign}
                iconColor="var(--color-green)"
                delay={0.3}
              />

              <StatCard
                label="Change Orders"
                value="2"
                subvalue="Pending approval"
                icon={FileText}
                iconColor="#60a5fa"
                delay={0.4}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Progress Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-8 flex flex-col items-center"
              >
                <h3 className="text-sm uppercase tracking-widest text-chimera-text-muted mb-6 self-start">
                  Project Progress
                </h3>
                <CircularProgress
                  value={current.progress}
                  size={200}
                  strokeWidth={14}
                  label="Complete"
                  sublabel={`${current.progress}% of ${current.milestones.length} milestones`}
                />

                {/* Mini milestone indicators */}
                <div className="w-full mt-8 space-y-3">
                  {current.milestones.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          m.completed ? 'bg-green-500' : 'bg-chimera-text-muted'
                        }`}
                      />
                      <span className={`text-sm ${m.completed ? 'text-chimera-text-muted line-through' : 'text-white'}`}>
                        {m.title}
                      </span>
                    </div>
                  ))}
                  {current.milestones.length > 3 && (
                    <div className="text-xs text-chimera-text-muted pl-5">
                      +{current.milestones.length - 3} more milestones
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Budget Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2 glass rounded-2xl p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm uppercase tracking-widest text-chimera-text-muted">
                    Budget Utilization
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-chimera-gold" />
                    <span className="text-chimera-gold">
                      {Math.round((current.budget.spent / current.budget.allocated) * 100)}% utilized
                    </span>
                  </div>
                </div>
                <BudgetBurnChart
                  data={budgetData}
                  height={280}
                  showProjected={current.budget.spent > current.budget.allocated * 0.85}
                />
              </motion.div>
            </div>

            {/* Timeline & Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Project Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass rounded-2xl p-8"
              >
                <h3 className="text-sm uppercase tracking-widest text-chimera-text-muted mb-6">
                  Project Timeline
                </h3>
                {timelineMilestones.length > 0 ? (
                  <ProjectTimeline
                    milestones={timelineMilestones}
                    currentPhase={currentMilestoneIndex}
                  />
                ) : (
                  <div className="text-chimera-text-muted text-center py-8">
                    No milestones defined
                  </div>
                )}
              </motion.div>

              {/* Activity Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass rounded-2xl p-8"
              >
                <h3 className="text-sm uppercase tracking-widest text-chimera-text-muted mb-6">
                  Recent Activity
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {recentActivity.map((item, index) => {
                      const Icon = iconMap[item.type];
                      const colors = colorMap[item.type];

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.05 }}
                          className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                            style={{ backgroundColor: colors.bg }}
                          >
                            <Icon className="w-5 h-5" style={{ color: colors.text }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white leading-relaxed">{item.message}</p>
                            <p className="text-xs text-chimera-text-muted mt-1">
                              {new Date(item.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <a
                href="tel:+17809348696"
                className="inline-flex items-center gap-2 px-6 py-3 bg-chimera-gold text-black rounded-xl font-medium hover:bg-white transition-colors"
              >
                <Phone className="w-4 h-4" />
                Contact Project Manager
              </a>
              <a
                href="/client-portal/documents"
                className="inline-flex items-center gap-2 px-6 py-3 glass rounded-xl font-medium hover:border-chimera-gold/50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Documents
              </a>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 glass rounded-2xl"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-chimera-text-muted" />
            </div>
            <h3 className="text-xl font-medium mb-2">No Active Projects</h3>
            <p className="text-chimera-text-muted max-w-md mx-auto">
              You don&apos;t have any projects assigned to your account yet. Contact us to get started on your renovation journey.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
