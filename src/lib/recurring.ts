import type { Transaction, RecurringPayment } from "./types";

/**
 * Parse YYYY-MM-DD as UTC to avoid timezone/DST issues in day calculations.
 */
function parseDateUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function detectRecurring(transactions: Transaction[]): RecurringPayment[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length === 0) return [];

  // Group by merchant (trim whitespace to avoid empty-string keys)
  const merchantGroups = new Map<string, Transaction[]>();
  for (const txn of expenses) {
    const key = txn.merchant?.trim() || txn.description.trim();
    if (!key) continue;
    const group = merchantGroups.get(key) || [];
    group.push(txn);
    merchantGroups.set(key, group);
  }

  const recurring: RecurringPayment[] = [];

  for (const [merchant, txns] of merchantGroups) {
    if (txns.length < 3) continue;

    // Sort by date
    const sorted = [...txns].sort((a, b) => a.txnDate.localeCompare(b.txnDate));

    // Compute deltas between consecutive transactions in days (UTC-safe)
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseDateUTC(sorted[i - 1].txnDate);
      const curr = parseDateUTC(sorted[i].txnDate);
      const daysDiff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      deltas.push(daysDiff);
    }

    if (deltas.length === 0) continue;

    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    // Use integer cents for amount averaging to avoid float drift
    const totalCents = sorted.reduce((sum, t) => sum + Math.abs(Math.round(t.amount * 100)), 0);
    const avgAmount = Math.round(totalCents / sorted.length) / 100;

    let cadence: RecurringPayment["cadence"] = "unknown";
    if (avgDelta >= 5 && avgDelta <= 9) {
      cadence = "weekly";
    } else if (avgDelta >= 12 && avgDelta <= 17) {
      cadence = "fortnightly";
    } else if (avgDelta >= 25 && avgDelta <= 38) {
      cadence = "monthly";
    } else if (avgDelta >= 80 && avgDelta <= 100) {
      cadence = "quarterly";
    } else if (avgDelta >= 340 && avgDelta <= 400) {
      cadence = "annual";
    }

    // Filter: only flag if cadence is detected OR amount is consistent
    const amountVariance = computeVarianceCoeff(sorted.map((t) => Math.abs(t.amount)));
    const isConsistentAmount = amountVariance < 0.3;

    if (cadence !== "unknown" || isConsistentAmount) {
      recurring.push({
        merchant,
        cadence,
        avgAmount,
        count: sorted.length,
        lastDate: sorted[sorted.length - 1].txnDate,
      });
    }
  }

  // Sort: known cadences first, then by amount
  return recurring.sort((a, b) => {
    const cadenceOrder: Record<string, number> = {
      weekly: 0,
      fortnightly: 1,
      monthly: 2,
      quarterly: 3,
      annual: 4,
      unknown: 5,
    };
    const orderDiff = (cadenceOrder[a.cadence] ?? 5) - (cadenceOrder[b.cadence] ?? 5);
    if (orderDiff !== 0) return orderDiff;
    return b.avgAmount - a.avgAmount;
  });
}

function computeVarianceCoeff(values: number[]): number {
  if (values.length < 2) return Infinity;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  // Bessel's correction (n-1) for sample standard deviation
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance) / mean;
}
