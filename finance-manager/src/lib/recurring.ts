import type { Transaction, RecurringPayment } from "./types";

export function detectRecurring(transactions: Transaction[]): RecurringPayment[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length === 0) return [];

  // Group by merchant
  const merchantGroups = new Map<string, Transaction[]>();
  for (const txn of expenses) {
    const key = txn.merchant || txn.description;
    const group = merchantGroups.get(key) || [];
    group.push(txn);
    merchantGroups.set(key, group);
  }

  const recurring: RecurringPayment[] = [];

  for (const [merchant, txns] of merchantGroups) {
    if (txns.length < 3) continue;

    // Sort by date
    const sorted = [...txns].sort((a, b) => a.txnDate.localeCompare(b.txnDate));

    // Compute deltas between consecutive transactions in days
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].txnDate).getTime();
      const curr = new Date(sorted[i].txnDate).getTime();
      const daysDiff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      deltas.push(daysDiff);
    }

    if (deltas.length === 0) continue;

    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const avgAmount =
      sorted.reduce((sum, t) => sum + Math.abs(t.amount), 0) / sorted.length;

    let cadence: "weekly" | "monthly" | "annual" | "unknown" = "unknown";
    if (avgDelta >= 5 && avgDelta <= 9) {
      cadence = "weekly";
    } else if (avgDelta >= 25 && avgDelta <= 38) {
      cadence = "monthly";
    } else if (avgDelta >= 340 && avgDelta <= 400) {
      cadence = "annual";
    }

    // Filter: only flag if cadence is detected OR amount is consistent
    const amountVariance = computeVarianceCoeff(sorted.map((t) => Math.abs(t.amount)));
    const isConsistentAmount = amountVariance < 0.3; // less than 30% coefficient of variation

    if (cadence !== "unknown" || isConsistentAmount) {
      recurring.push({
        merchant,
        cadence,
        avgAmount: Math.round(avgAmount * 100) / 100,
        count: sorted.length,
        lastDate: sorted[sorted.length - 1].txnDate,
      });
    }
  }

  // Sort: known cadences first, then by amount
  return recurring.sort((a, b) => {
    const cadenceOrder: Record<string, number> = {
      weekly: 0,
      monthly: 1,
      annual: 2,
      unknown: 3,
    };
    const orderDiff = cadenceOrder[a.cadence] - cadenceOrder[b.cadence];
    if (orderDiff !== 0) return orderDiff;
    return b.avgAmount - a.avgAmount;
  });
}

function computeVarianceCoeff(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}
