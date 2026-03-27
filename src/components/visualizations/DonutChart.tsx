'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface DonutData {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
}

export default function DonutChart({
  data,
  size = 200,
  innerRadius = 60,
  outerRadius = 80,
  centerLabel,
  centerValue,
  showLegend = true,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={hoveredIndex !== null ? outerRadius + 6 : outerRadius}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="var(--color-dark)"
                  strokeWidth={2}
                  style={{
                    filter: hoveredIndex === index ? `drop-shadow(0 0 8px ${entry.color})` : 'none',
                    opacity: hoveredIndex !== null && hoveredIndex !== index ? 0.5 : 1,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && (
            <span className="font-display text-2xl text-white">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(0);
            const isHovered = hoveredIndex === index;

            return (
              <motion.button
                key={item.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isHovered ? 'glass-elevated' : 'hover:glass'
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div
                  className="w-3 h-3 rounded-full transition-shadow"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: isHovered ? `0 0 10px ${item.color}` : 'none',
                  }}
                />
                <span className={`text-sm transition-colors ${isHovered ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                  {item.name}
                </span>
                <span className="text-sm font-medium text-white">{percentage}%</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Pre-configured invoice status donut
export function InvoiceStatusDonut({
  paid,
  pending,
  overdue,
}: {
  paid: number;
  pending: number;
  overdue: number;
}) {
  const data = [
    { name: 'Paid', value: paid, color: 'var(--color-green)' },
    { name: 'Pending', value: pending, color: 'var(--accent)' },
    { name: 'Overdue', value: overdue, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const total = paid + pending + overdue;

  return (
    <DonutChart
      data={data}
      size={180}
      innerRadius={50}
      outerRadius={70}
      centerValue={total.toString()}
      centerLabel="Invoices"
    />
  );
}

// Budget allocation donut
export function BudgetAllocationDonut({
  spent,
  remaining,
}: {
  spent: number;
  remaining: number;
}) {
  const data = [
    { name: 'Spent', value: spent, color: 'var(--accent)' },
    { name: 'Remaining', value: remaining, color: 'var(--text-muted)' },
  ];

  const total = spent + remaining;
  const percentUsed = Math.round((spent / total) * 100);

  return (
    <DonutChart
      data={data}
      size={160}
      innerRadius={45}
      outerRadius={60}
      centerValue={`${percentUsed}%`}
      centerLabel="Used"
      showLegend={true}
    />
  );
}
