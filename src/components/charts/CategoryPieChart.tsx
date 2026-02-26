"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { CategoryBreakdown } from "@/lib/types";
import { formatCurrency, getCategoryColor, formatPercentage } from "@/lib/utils";

interface CategoryPieChartProps {
  data: CategoryBreakdown[];
}

interface TooltipPayload {
  payload: CategoryBreakdown;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <p className="text-xs font-semibold text-slate-700 mb-1">{item.category}</p>
      <p className="text-xs text-slate-500">
        {formatCurrency(item.total)} ({formatPercentage(item.percentage)})
      </p>
      <p className="text-xs text-slate-400">{item.count} transactions</p>
    </div>
  );
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        No expense data
      </div>
    );
  }

  // Show top 8, group rest
  const topItems = data.slice(0, 8);
  const others = data.slice(8);
  const displayData =
    others.length > 0
      ? [
          ...topItems,
          {
            category: "Other",
            total: others.reduce((s, i) => s + i.total, 0),
            count: others.reduce((s, i) => s + i.count, 0),
            percentage: others.reduce((s, i) => s + i.percentage, 0),
          },
        ]
      : topItems;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={displayData}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={110}
          innerRadius={60}
          paddingAngle={2}
          strokeWidth={2}
          stroke="#fff"
        >
          {displayData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getCategoryColor(entry.category)}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-slate-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
