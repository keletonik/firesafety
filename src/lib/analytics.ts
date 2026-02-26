import type {
  Transaction,
  CashflowMetrics,
  CategoryBreakdown,
  MerchantBreakdown,
  DailySpend,
  MonthlyTrend,
  AnomalyEntry,
} from "./types";

/**
 * Round to 2 decimal places using toFixed for correct financial rounding.
 * Coerces -0 to 0.
 */
function round2(n: number): number {
  return Number(n.toFixed(2)) || 0;
}

/**
 * Parse YYYY-MM-DD as UTC to avoid timezone/DST issues.
 */
function parseDateUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function computeCashflow(transactions: Transaction[]): CashflowMetrics {
  if (transactions.length === 0) {
    return {
      incomeTotal: 0,
      expenseTotal: 0,
      netTotal: 0,
      avgDailySpend: 0,
      periodStart: "",
      periodEnd: "",
      transactionCount: 0,
    };
  }

  // Use integer cents to avoid floating-point accumulation drift
  let incomeCents = 0;
  let expenseCents = 0;

  for (const txn of transactions) {
    const cents = Math.round(txn.amount * 100);
    if (txn.amount > 0) {
      incomeCents += cents;
    } else if (txn.amount < 0) {
      expenseCents += Math.abs(cents);
    }
    // amount === 0: skip (neither income nor expense)
  }

  const dates = transactions.map((t) => t.txnDate).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];

  const startMs = parseDateUTC(periodStart);
  const endMs = parseDateUTC(periodEnd);
  const days = Math.max(Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1, 1);

  const incomeTotal = round2(incomeCents / 100);
  const expenseTotal = round2(expenseCents / 100);

  return {
    incomeTotal,
    expenseTotal,
    netTotal: round2(incomeTotal - expenseTotal),
    avgDailySpend: round2(expenseTotal / days),
    periodStart,
    periodEnd,
    transactionCount: transactions.length,
  };
}

export function computeCategoryBreakdown(
  transactions: Transaction[]
): CategoryBreakdown[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length === 0) return [];

  let totalExpenseCents = 0;
  const map = new Map<string, { cents: number; count: number }>();

  for (const txn of expenses) {
    const cents = Math.abs(Math.round(txn.amount * 100));
    totalExpenseCents += cents;
    const existing = map.get(txn.category) || { cents: 0, count: 0 };
    existing.cents += cents;
    existing.count += 1;
    map.set(txn.category, existing);
  }

  const result: CategoryBreakdown[] = [];
  for (const [category, data] of map) {
    const total = round2(data.cents / 100);
    result.push({
      category,
      total,
      count: data.count,
      percentage: round2((data.cents / totalExpenseCents) * 100),
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function computeMerchantBreakdown(
  transactions: Transaction[]
): MerchantBreakdown[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length === 0) return [];

  const map = new Map<string, { cents: number; count: number }>();
  for (const txn of expenses) {
    const key = txn.merchant?.trim() || txn.description.trim();
    const cents = Math.abs(Math.round(txn.amount * 100));
    const existing = map.get(key) || { cents: 0, count: 0 };
    existing.cents += cents;
    existing.count += 1;
    map.set(key, existing);
  }

  const result: MerchantBreakdown[] = [];
  for (const [merchant, data] of map) {
    result.push({
      merchant,
      total: round2(data.cents / 100),
      count: data.count,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function computeDailySpend(transactions: Transaction[]): DailySpend[] {
  if (transactions.length === 0) return [];

  const map = new Map<string, { incomeCents: number; expenseCents: number }>();
  for (const txn of transactions) {
    const existing = map.get(txn.txnDate) || { incomeCents: 0, expenseCents: 0 };
    const cents = Math.round(txn.amount * 100);
    if (txn.amount > 0) {
      existing.incomeCents += cents;
    } else if (txn.amount < 0) {
      existing.expenseCents += Math.abs(cents);
    }
    map.set(txn.txnDate, existing);
  }

  const result: DailySpend[] = [];
  for (const [date, data] of map) {
    const income = round2(data.incomeCents / 100);
    const expense = round2(data.expenseCents / 100);
    result.push({
      date,
      income,
      expense,
      net: round2(income - expense),
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeMonthlyTrends(transactions: Transaction[]): MonthlyTrend[] {
  if (transactions.length === 0) return [];

  const map = new Map<string, { incomeCents: number; expenseCents: number }>();
  for (const txn of transactions) {
    const month = txn.txnDate.substring(0, 7);
    const existing = map.get(month) || { incomeCents: 0, expenseCents: 0 };
    const cents = Math.round(txn.amount * 100);
    if (txn.amount > 0) {
      existing.incomeCents += cents;
    } else if (txn.amount < 0) {
      existing.expenseCents += Math.abs(cents);
    }
    map.set(month, existing);
  }

  const result: MonthlyTrend[] = [];
  for (const [month, data] of map) {
    const income = round2(data.incomeCents / 100);
    const expense = round2(data.expenseCents / 100);
    result.push({
      month,
      income,
      expense,
      net: round2(income - expense),
    });
  }

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

export function detectAnomalies(transactions: Transaction[]): AnomalyEntry[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length < 5) return [];

  // Collect amounts per category
  const categoryAmounts = new Map<string, number[]>();
  for (const txn of expenses) {
    const amounts = categoryAmounts.get(txn.category) || [];
    amounts.push(Math.abs(txn.amount));
    categoryAmounts.set(txn.category, amounts);
  }

  // Precompute stats per category (O(n) instead of O(n*m))
  const categoryStats = new Map<string, { mean: number; stdDev: number }>();
  for (const [category, amounts] of categoryAmounts) {
    if (amounts.length < 3) continue;
    const n = amounts.length;
    const mean = amounts.reduce((a, b) => a + b, 0) / n;
    // Bessel's correction (n-1) for sample stddev
    const variance =
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    categoryStats.set(category, { mean, stdDev });
  }

  const anomalies: AnomalyEntry[] = [];
  const seen = new Set<string>();

  for (const txn of expenses) {
    const stats = categoryStats.get(txn.category);
    if (!stats) continue;

    const absAmount = Math.abs(txn.amount);
    if (stats.stdDev > 0 && absAmount > stats.mean + 2 * stats.stdDev) {
      // Deduplicate by transaction ID
      if (seen.has(txn.id)) continue;
      seen.add(txn.id);

      anomalies.push({
        date: txn.txnDate,
        merchant: txn.merchant?.trim() || txn.description,
        amount: round2(absAmount),
        reason: `Unusually high for ${txn.category} (avg: $${round2(stats.mean)}, this: $${round2(absAmount)})`,
      });
    }
  }

  return anomalies.sort((a, b) => b.amount - a.amount).slice(0, 20);
}
