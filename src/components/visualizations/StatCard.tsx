'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Sparkline from './Sparkline';

interface StatCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  sparklineData?: number[];
  icon?: LucideIcon;
  iconColor?: string;
  delay?: number;
  onClick?: () => void;
}

export default function StatCard({
  label,
  value,
  subvalue,
  trend,
  trendValue,
  sparklineData,
  icon: Icon,
  iconColor = 'var(--accent)',
  delay = 0,
  onClick,
}: StatCardProps) {
  const trendColors = {
    up: 'var(--color-green)',
    down: '#ef4444',
    neutral: 'var(--text-muted)',
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={onClick ? { scale: 1.02, y: -2 } : { y: -2 }}
      onClick={onClick}
      className={`glass rounded-xl p-6 transition-all duration-300 ${
        onClick ? 'cursor-pointer glow-hover' : 'card-hover'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          {label}
        </span>
        {Icon && (
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
        )}
      </div>

      {/* Main value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-display text-3xl text-white tracking-tight">
          {value}
        </span>
        {trend && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.2 }}
            className="text-sm font-medium"
            style={{ color: trendColors[trend] }}
          >
            {trendIcons[trend]} {trendValue}
          </motion.span>
        )}
      </div>

      {/* Subvalue */}
      {subvalue && (
        <p className="text-sm text-[var(--text-ghost)] mb-4">{subvalue}</p>
      )}

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--glass-border)]">
          <Sparkline
            data={sparklineData}
            width={100}
            height={32}
            color={trend ? trendColors[trend] : 'var(--accent)'}
          />
          <span className="text-xs text-[var(--text-ghost)]">vs last period</span>
        </div>
      )}
    </motion.div>
  );
}

// Specialized stat cards
export function BudgetStatCard({
  allocated,
  spent,
  sparklineData,
  delay = 0,
}: {
  allocated: number;
  spent: number;
  sparklineData?: number[];
  delay?: number;
}) {
  const percentUsed = Math.round((spent / allocated) * 100);
  const remaining = allocated - spent;
  const isOverBudget = spent > allocated;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="glass rounded-xl p-6 card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          Budget
        </span>
        <div
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: isOverBudget ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 161, 54, 0.15)',
            color: isOverBudget ? '#ef4444' : 'var(--accent)',
          }}
        >
          {percentUsed}% used
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl text-white">
            ${spent.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            / ${allocated.toLocaleString()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: isOverBudget ? '#ef4444' : 'var(--accent)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentUsed, 100)}%` }}
            transition={{ delay: delay + 0.3, duration: 1, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-ghost)]">
            ${remaining.toLocaleString()} remaining
          </span>
          {isOverBudget && (
            <span className="text-red-400 font-medium">
              Over by ${(spent - allocated).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {sparklineData && (
        <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
          <Sparkline data={sparklineData} width={200} height={40} />
        </div>
      )}
    </motion.div>
  );
}

export function ProgressStatCard({
  progress,
  label,
  sublabel,
  delay = 0,
}: {
  progress: number;
  label: string;
  sublabel?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="glass rounded-xl p-6 card-hover"
    >
      <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] block mb-4">
        {label}
      </span>

      <div className="flex items-center gap-4">
        {/* Circular indicator */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="6"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={226}
              initial={{ strokeDashoffset: 226 }}
              animate={{ strokeDashoffset: 226 - (226 * progress) / 100 }}
              transition={{ delay: delay + 0.2, duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-xl text-white">{progress}%</span>
          </div>
        </div>

        <div className="flex-1">
          {sublabel && (
            <p className="text-sm text-[var(--text-secondary)]">{sublabel}</p>
          )}
          <div className="h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden mt-2">
            <motion.div
              className="h-full bg-[var(--accent)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ delay: delay + 0.3, duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
