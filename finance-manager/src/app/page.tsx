"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  AlertTriangle,
} from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CashflowChart from "@/components/charts/CashflowChart";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import MerchantBarChart from "@/components/charts/MerchantBarChart";
import { formatCurrency, formatDate, getCategoryColor } from "@/lib/utils";
import type {
  CashflowMetrics,
  CategoryBreakdown,
  MerchantBreakdown,
  DailySpend,
  MonthlyTrend,
  AnomalyEntry,
} from "@/lib/types";

interface AnalyticsData {
  cashflow: CashflowMetrics;
  categories: CategoryBreakdown[];
  merchants: MerchantBreakdown[];
  dailySpend: DailySpend[];
  monthlyTrends: MonthlyTrend[];
  anomalies: AnomalyEntry[];
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to load analytics data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }
  if (!data || data.cashflow.transactionCount === 0) {
    return <EmptyState />;
  }

  const { cashflow, categories, merchants, dailySpend, monthlyTrends, anomalies } =
    data;

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Income"
          value={formatCurrency(cashflow.incomeTotal)}
          subtitle={`${cashflow.periodStart ? formatDate(cashflow.periodStart) : ""} – ${cashflow.periodEnd ? formatDate(cashflow.periodEnd) : ""}`}
          icon={TrendingUp}
          variant="income"
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(cashflow.expenseTotal)}
          subtitle={`${cashflow.transactionCount} transactions`}
          icon={TrendingDown}
          variant="expense"
        />
        <MetricCard
          title="Net Cashflow"
          value={formatCurrency(cashflow.netTotal)}
          subtitle={cashflow.netTotal >= 0 ? "Positive balance" : "Negative balance"}
          icon={DollarSign}
          variant="net"
        />
        <MetricCard
          title="Avg Daily Spend"
          value={formatCurrency(cashflow.avgDailySpend)}
          subtitle="Per calendar day"
          icon={Activity}
          variant="default"
        />
      </div>

      {/* Cashflow Chart */}
      <div className="card p-6">
        <h3 className="section-title mb-4">Daily Cashflow</h3>
        <CashflowChart data={dailySpend} />
      </div>

      {/* Category + Merchant Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="section-title mb-4">Spend by Category</h3>
          <CategoryPieChart data={categories} />
          {/* Category breakdown table */}
          <div className="mt-4 space-y-2">
            {categories.slice(0, 8).map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(cat.category),
                    }}
                  />
                  <span className="text-slate-700 font-medium">{cat.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs">
                    {cat.count} txns
                  </span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Top Merchants</h3>
          <MerchantBarChart data={merchants} maxItems={10} />
        </div>
      </div>

      {/* Monthly Trends */}
      {monthlyTrends.length > 1 && (
        <div className="card p-6">
          <h3 className="section-title mb-4">Monthly Trends</h3>
          <MonthlyBarChart data={monthlyTrends} />
        </div>
      )}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="section-title">Unusual Transactions</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={i}>
                    <td className="tabular-nums">{formatDate(a.date)}</td>
                    <td className="capitalize">{a.merchant}</td>
                    <td className="tabular-nums font-medium text-red-600">
                      {formatCurrency(a.amount)}
                    </td>
                    <td className="text-slate-500 text-xs">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
