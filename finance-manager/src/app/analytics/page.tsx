"use client";

import { useState, useEffect, useCallback } from "react";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CategoryPieChart from "@/components/charts/CategoryPieChart";
import MerchantBarChart from "@/components/charts/MerchantBarChart";
import MonthlyBarChart from "@/components/charts/MonthlyBarChart";
import {
  formatCurrency,
  formatPercentage,
  getCategoryColor,
} from "@/lib/utils";
import type {
  CategoryBreakdown,
  MerchantBreakdown,
  MonthlyTrend,
} from "@/lib/types";

interface AnalyticsData {
  categories: CategoryBreakdown[];
  merchants: MerchantBreakdown[];
  monthlyTrends: MonthlyTrend[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"categories" | "merchants" | "trends">(
    "categories"
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData({
        categories: json.categories,
        merchants: json.merchants,
        monthlyTrends: json.monthlyTrends,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingSpinner />;
  if (!data || (data.categories.length === 0 && data.merchants.length === 0)) {
    return <EmptyState />;
  }

  const tabs = [
    { id: "categories" as const, label: "Categories" },
    { id: "merchants" as const, label: "Merchants" },
    { id: "trends" as const, label: "Monthly Trends" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="card p-1 inline-flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category Tab */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="section-title mb-4">Expense Distribution</h3>
            <CategoryPieChart data={data.categories} />
          </div>
          <div className="card p-6">
            <h3 className="section-title mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {data.categories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: getCategoryColor(cat.category),
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {cat.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {formatPercentage(cat.percentage)}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: getCategoryColor(cat.category),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Merchants Tab */}
      {activeTab === "merchants" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="section-title mb-4">Top Merchants by Spend</h3>
            <MerchantBarChart data={data.merchants} maxItems={15} />
          </div>
          <div className="card p-6">
            <h3 className="section-title mb-4">Merchant Details</h3>
            <div className="table-container max-h-[600px] overflow-y-auto">
              <table className="data-table">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th>#</th>
                    <th>Merchant</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Count</th>
                    <th className="text-right">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {data.merchants.map((m, i) => (
                    <tr key={m.merchant}>
                      <td className="text-slate-400 text-xs">{i + 1}</td>
                      <td className="capitalize font-medium">{m.merchant}</td>
                      <td className="text-right tabular-nums font-semibold text-red-600">
                        {formatCurrency(m.total)}
                      </td>
                      <td className="text-right tabular-nums text-slate-500">
                        {m.count}
                      </td>
                      <td className="text-right tabular-nums text-slate-500">
                        {formatCurrency(m.total / m.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="section-title mb-4">Monthly Income vs Expenses</h3>
            <MonthlyBarChart data={data.monthlyTrends} />
          </div>
          <div className="card p-6">
            <h3 className="section-title mb-4">Monthly Summary</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Income</th>
                    <th className="text-right">Expenses</th>
                    <th className="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyTrends.map((m) => (
                    <tr key={m.month}>
                      <td className="font-medium">{m.month}</td>
                      <td className="text-right tabular-nums text-emerald-600">
                        {formatCurrency(m.income)}
                      </td>
                      <td className="text-right tabular-nums text-red-600">
                        {formatCurrency(m.expense)}
                      </td>
                      <td
                        className={`text-right tabular-nums font-semibold ${
                          m.net >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {m.net >= 0 ? "+" : ""}
                        {formatCurrency(m.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
