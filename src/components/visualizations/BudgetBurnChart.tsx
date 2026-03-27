'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface BudgetDataPoint {
  date: string;
  spent: number;
  allocated: number;
  projected?: number;
}

interface BudgetBurnChartProps {
  data: BudgetDataPoint[];
  height?: number;
  showProjected?: boolean;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 border border-[var(--glass-border-accent)]">
        <p className="text-sm text-[var(--text-muted)] mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function BudgetBurnChart({
  data,
  height = 300,
  showProjected = true,
}: BudgetBurnChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          onMouseMove={(e) => {
            if (e.activeTooltipIndex !== undefined && typeof e.activeTooltipIndex === 'number') {
              setHoveredPoint(e.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => {
            setHoveredPoint(null);
          }}
        >
          <defs>
            <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="allocatedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--text-muted)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--text-muted)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            dx={-10}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Allocated budget line (target) */}
          <Area
            type="monotone"
            dataKey="allocated"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="url(#allocatedGradient)"
            name="Budget"
          />

          {/* Actual spent */}
          <Area
            type="monotone"
            dataKey="spent"
            stroke="var(--accent)"
            strokeWidth={3}
            fill="url(#spentGradient)"
            name="Spent"
            animationDuration={2000}
          />

          {/* Projected spend (if over budget) */}
          {showProjected && data.some(d => d.projected) && (
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#projectedGradient)"
              name="Projected"
            />
          )}

          {/* Current point indicator */}
          {hoveredPoint !== null && (
            <ReferenceLine
              x={data[hoveredPoint]?.date}
              stroke="var(--accent)"
              strokeOpacity={0.3}
              strokeDasharray="3 3"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
          <span className="text-[var(--text-muted)]">Actual Spend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-dashed border-[var(--text-muted)]" />
          <span className="text-[var(--text-muted)]">Budget</span>
        </div>
        {showProjected && data.some(d => d.projected) && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-dashed border-red-500" />
            <span className="text-[var(--text-muted)]">Projected</span>
          </div>
        )}
      </div>
    </div>
  );
}
