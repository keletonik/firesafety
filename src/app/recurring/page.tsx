"use client";

import { useState, useEffect, useCallback } from "react";
import { Repeat, Calendar, DollarSign, Hash } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { RecurringPayment } from "@/lib/types";

const cadenceBadgeStyles: Record<string, string> = {
  weekly: "badge-blue",
  fortnightly: "badge-blue",
  monthly: "badge-green",
  quarterly: "badge-amber",
  annual: "badge-amber",
  unknown: "badge-slate",
};

const cadenceLabels: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  unknown: "Irregular",
};

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/recurring");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setRecurring(json.recurring);
    } catch {
      setRecurring([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingSpinner />;
  if (recurring.length === 0) {
    return (
      <EmptyState
        title="No recurring payments detected"
        message="Import more transaction data to detect subscriptions and recurring charges. The detector needs at least 3 similar transactions to identify patterns."
      />
    );
  }

  const cadenceMultiplier: Record<string, number> = {
    weekly: 4.33,
    fortnightly: 2.17,
    monthly: 1,
    quarterly: 1 / 3,
    annual: 1 / 12,
    unknown: 1,
  };
  const estimatedMonthly = recurring.reduce(
    (sum, r) => sum + r.avgAmount * (cadenceMultiplier[r.cadence] ?? 1),
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Estimated Monthly Recurring
          </p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(estimatedMonthly)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Based on detected patterns
          </p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Detected Subscriptions
          </p>
          <p className="text-2xl font-bold text-slate-900">{recurring.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            Across all cadences
          </p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Estimated Annual Cost
          </p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(estimatedMonthly * 12)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Projected from monthly estimate
          </p>
        </div>
      </div>

      {/* Recurring items */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="section-title">Detected Recurring Payments</h3>
          <p className="text-xs text-slate-500 mt-1">
            Transactions that appear at regular intervals with consistent amounts
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {recurring.map((item, i) => (
            <div
              key={i}
              className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Repeat className="w-5 h-5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 capitalize truncate">
                    {item.merchant}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(cadenceBadgeStyles[item.cadence])}>
                      {cadenceLabels[item.cadence]}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Hash className="w-3 h-3" />
                      {item.count} charges
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      Last: {formatDate(item.lastDate)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-bold text-slate-800 tabular-nums">
                  {formatCurrency(item.avgAmount)}
                </p>
                <p className="text-xs text-slate-400">avg per charge</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="card p-5 bg-amber-50/50 border-amber-200/40">
        <div className="flex gap-3">
          <DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Review your subscriptions
            </p>
            <p className="text-xs text-amber-700/80 mt-1">
              Most people have 2-3 subscriptions they no longer use. Review each item above
              and cancel anything you haven&apos;t used in the last 30 days. Even saving one
              $15/month subscription adds up to $180/year.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
