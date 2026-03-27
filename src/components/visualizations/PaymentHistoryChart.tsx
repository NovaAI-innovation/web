'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

interface PaymentData {
  month: string;
  paid: number;
  pending: number;
  overdue: number;
}

interface PaymentHistoryChartProps {
  data: PaymentData[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="glass rounded-lg p-3 border border-[var(--glass-border-accent)] min-w-[150px]">
        <p className="text-sm font-medium text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center text-sm mb-1">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="text-white font-medium">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
        <div className="border-t border-[var(--glass-border)] mt-2 pt-2 flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Total</span>
          <span className="text-white font-medium">${total.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function PaymentHistoryChart({
  data,
  height = 280,
}: PaymentHistoryChartProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barGap={4}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.05)"
            vertical={false}
          />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            dx={-10}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />

          {/* Paid - Green */}
          <Bar
            dataKey="paid"
            name="Paid"
            radius={[4, 4, 0, 0]}
            onMouseEnter={() => setHoveredBar('paid')}
            onMouseLeave={() => setHoveredBar(null)}
            animationDuration={1500}
          >
            {data.map((_, index) => (
              <Cell
                key={`paid-${index}`}
                fill="var(--color-green)"
                fillOpacity={hoveredBar === 'paid' || hoveredBar === null ? 0.9 : 0.4}
              />
            ))}
          </Bar>

          {/* Pending - Gold */}
          <Bar
            dataKey="pending"
            name="Pending"
            radius={[4, 4, 0, 0]}
            onMouseEnter={() => setHoveredBar('pending')}
            onMouseLeave={() => setHoveredBar(null)}
            animationDuration={1500}
          >
            {data.map((_, index) => (
              <Cell
                key={`pending-${index}`}
                fill="var(--accent)"
                fillOpacity={hoveredBar === 'pending' || hoveredBar === null ? 0.9 : 0.4}
              />
            ))}
          </Bar>

          {/* Overdue - Red */}
          <Bar
            dataKey="overdue"
            name="Overdue"
            radius={[4, 4, 0, 0]}
            onMouseEnter={() => setHoveredBar('overdue')}
            onMouseLeave={() => setHoveredBar(null)}
            animationDuration={1500}
          >
            {data.map((_, index) => (
              <Cell
                key={`overdue-${index}`}
                fill="#ef4444"
                fillOpacity={hoveredBar === 'overdue' || hoveredBar === null ? 0.9 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      <motion.div
        className="flex justify-center gap-6 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[
          { name: 'Paid', color: 'var(--color-green)', key: 'paid' },
          { name: 'Pending', color: 'var(--accent)', key: 'pending' },
          { name: 'Overdue', color: '#ef4444', key: 'overdue' },
        ].map((item) => (
          <motion.button
            key={item.name}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all"
            style={{
              backgroundColor: hoveredBar === item.key ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            }}
            onMouseEnter={() => setHoveredBar(item.key)}
            onMouseLeave={() => setHoveredBar(null)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: item.color,
                boxShadow: hoveredBar === item.key ? `0 0 8px ${item.color}` : 'none',
              }}
            />
            <span className={hoveredBar === item.key ? 'text-white' : 'text-[var(--text-muted)]'}>
              {item.name}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
