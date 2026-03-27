'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  date: string;
  status: 'completed' | 'current' | 'upcoming' | 'delayed';
  description?: string;
}

interface ProjectTimelineProps {
  milestones: Milestone[];
  currentPhase?: number;
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: 'var(--color-green)',
    bgColor: 'rgba(22, 163, 74, 0.15)',
    label: 'Completed',
  },
  current: {
    icon: Circle,
    color: 'var(--accent)',
    bgColor: 'rgba(212, 161, 54, 0.15)',
    label: 'In Progress',
  },
  upcoming: {
    icon: Clock,
    color: 'var(--text-muted)',
    bgColor: 'rgba(255, 255, 255, 0.05)',
    label: 'Upcoming',
  },
  delayed: {
    icon: AlertCircle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: 'Delayed',
  },
};

export default function ProjectTimeline({ milestones, currentPhase = 0 }: ProjectTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--accent)] via-[var(--text-muted)] to-transparent" />

      {/* Milestones */}
      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const config = statusConfig[milestone.status];
          const Icon = config.icon;
          const isActive = index === currentPhase;

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
              className={`relative flex gap-4 ${isActive ? 'scale-[1.02]' : ''}`}
            >
              {/* Icon marker */}
              <motion.div
                className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full shrink-0"
                style={{ backgroundColor: config.bgColor }}
                animate={milestone.status === 'current' ? {
                  boxShadow: [
                    '0 0 0 0 rgba(212, 161, 54, 0)',
                    '0 0 0 8px rgba(212, 161, 54, 0.2)',
                    '0 0 0 0 rgba(212, 161, 54, 0)',
                  ],
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon className="w-5 h-5" style={{ color: config.color }} />
              </motion.div>

              {/* Content card */}
              <div
                className={`flex-1 p-4 rounded-xl border transition-all duration-300 ${
                  isActive
                    ? 'glass-elevated border-[var(--glass-border-accent)]'
                    : 'glass border-[var(--glass-border)] hover:border-[var(--glass-border-accent)]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className={`font-medium ${isActive ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                    {milestone.title}
                  </h4>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: config.bgColor,
                      color: config.color,
                    }}
                  >
                    {config.label}
                  </span>
                </div>

                <p className="text-sm text-[var(--text-muted)] mb-1">
                  {milestone.date}
                </p>

                {milestone.description && (
                  <p className="text-sm text-[var(--text-ghost)] mt-2">
                    {milestone.description}
                  </p>
                )}

                {/* Progress bar for current milestone */}
                {milestone.status === 'current' && (
                  <div className="mt-3">
                    <div className="h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: config.color }}
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-ghost)] mt-1">65% complete</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
