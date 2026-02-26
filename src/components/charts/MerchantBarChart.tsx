"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MerchantBreakdown } from "@/lib/types";
import { formatCurrency, CHART_COLORS } from "@/lib/utils";

interface MerchantBarChartProps {
  data: MerchantBreakdown[];
  maxItems?: number;
}

interface TooltipPayload {
  payload: MerchantBreakdown;
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
      <p className="text-xs font-semibold text-slate-700 mb-1 capitalize">
        {item.merchant}
      </p>
      <p className="text-xs text-slate-500">{formatCurrency(item.total)}</p>
      <p className="text-xs text-slate-400">{item.count} transactions</p>
    </div>
  );
}

export default function MerchantBarChart({
  data,
  maxItems = 12,
}: MerchantBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        No merchant data
      </div>
    );
  }

  const displayData = data.slice(0, maxItems);

  return (
    <ResponsiveContainer width="100%" height={Math.max(320, displayData.length * 36)}>
      <BarChart
        data={displayData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis
          type="category"
          dataKey="merchant"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="total"
          fill={CHART_COLORS[0]}
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
