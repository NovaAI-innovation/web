'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from 'recharts';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  strokeWidth?: number;
}

export default function Sparkline({
  data,
  width = 120,
  height = 40,
  color = 'var(--accent)',
  showArea = true,
  strokeWidth = 2,
}: SparklineProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Transform array of numbers into chart data format
  const chartData = data.map((value, index) => ({ value, index }));

  // Calculate trend
  const firstValue = data[0];
  const lastValue = data[data.length - 1];
  const trend = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'neutral';
  const trendColor = trend === 'up' ? 'var(--color-green)' : trend === 'down' ? '#ef4444' : color;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={chartData}>
          <defs>
            <linearGradient id={`sparklineGradient-${trend}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={trendColor}
                stopOpacity={showArea ? 0.3 : 0}
              />
              <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <YAxis domain={['dataMin', 'dataMax']} hide />

          <Line
            type="monotone"
            dataKey="value"
            stroke={trendColor}
            strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
            dot={false}
            activeDot={{
              r: 4,
              fill: trendColor,
              stroke: 'var(--color-dark)',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />

          {/* Area fill */}
          {showArea && (
            <Line
              type="monotone"
              dataKey="value"
              stroke="none"
              fill={`url(#sparklineGradient-${trend})`}
              fillOpacity={1}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 glass rounded text-xs whitespace-nowrap z-10">
          <span style={{ color: trendColor }}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            {' '}
            {Math.abs(((lastValue - firstValue) / firstValue) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Pre-configured sparklines for common use cases
export function PaymentSparkline({ data }: { data: number[] }) {
  return (
    <Sparkline
      data={data}
      color="var(--color-green)"
      width={100}
      height={32}
    />
  );
}

export function BudgetSparkline({ data }: { data: number[] }) {
  return (
    <Sparkline
      data={data}
      color="var(--accent)"
      width={100}
      height={32}
    />
  );
}

export function ActivitySparkline({ data }: { data: number[] }) {
  const trend = data[data.length - 1] > data[0] ? 'up' : 'down';
  return (
    <Sparkline
      data={data}
      color={trend === 'up' ? 'var(--color-green)' : '#ef4444'}
      width={80}
      height={24}
      strokeWidth={1.5}
    />
  );
}
