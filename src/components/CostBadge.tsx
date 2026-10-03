import React from 'react';
import { formatPercent } from '../utils/formatters';

interface CostBadgeProps {
  percent: number;
  targetPercent?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CostBadge: React.FC<CostBadgeProps> = ({
  percent,
  targetPercent = 35,
  label,
  size = 'md',
}) => {
  // Classification:
  // Green: <= 30% (Excellent profit)
  // Yellow/Amber: 30.1% - 35% (Standard)
  // Red/Rose: > 35% (High food cost / Alert)
  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let dotColor = 'bg-emerald-500';
  let statusText = 'ดีเยี่ยม (Good)';

  if (percent > targetPercent) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500 animate-pulse';
    statusText = 'ต้นทุนสูง (High)';
  } else if (percent > 30) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
    statusText = 'ปานกลาง (Medium)';
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${colorClasses} ${sizeClasses} whitespace-nowrap`}
      title={`Food Cost: ${percent.toFixed(1)}% (${statusText})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label && <span className="text-gray-500">{label}:</span>}
      <span className="font-bold">{formatPercent(percent)}</span>
    </span>
  );
};
