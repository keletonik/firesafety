import type {
  Transaction,
  CashflowMetrics,
  CategoryBreakdown,
  MerchantBreakdown,
  DailySpend,
  MonthlyTrend,
  AnomalyEntry,
} from "./types";

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

  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const txn of transactions) {
    if (txn.amount > 0) {
      incomeTotal += txn.amount;
    } else {
      expenseTotal += Math.abs(txn.amount);
    }
  }

  const dates = transactions.map((t) => t.txnDate).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];

  const startMs = new Date(periodStart).getTime();
  const endMs = new Date(periodEnd).getTime();
  const days = Math.max(Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1, 1);

  return {
    incomeTotal: round2(incomeTotal),
    expenseTotal: round2(expenseTotal),
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

  const totalExpense = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const map = new Map<string, { total: number; count: number }>();
  for (const txn of expenses) {
    const existing = map.get(txn.category) || { total: 0, count: 0 };
    existing.total += Math.abs(txn.amount);
    existing.count += 1;
    map.set(txn.category, existing);
  }

  const result: CategoryBreakdown[] = [];
  for (const [category, data] of map) {
    result.push({
      category,
      total: round2(data.total),
      count: data.count,
      percentage: round2((data.total / totalExpense) * 100),
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function computeMerchantBreakdown(
  transactions: Transaction[]
): MerchantBreakdown[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length === 0) return [];

  const map = new Map<string, { total: number; count: number }>();
  for (const txn of expenses) {
    const key = txn.merchant || txn.description;
    const existing = map.get(key) || { total: 0, count: 0 };
    existing.total += Math.abs(txn.amount);
    existing.count += 1;
    map.set(key, existing);
  }

  const result: MerchantBreakdown[] = [];
  for (const [merchant, data] of map) {
    result.push({
      merchant,
      total: round2(data.total),
      count: data.count,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function computeDailySpend(transactions: Transaction[]): DailySpend[] {
  if (transactions.length === 0) return [];

  const map = new Map<string, { income: number; expense: number }>();
  for (const txn of transactions) {
    const existing = map.get(txn.txnDate) || { income: 0, expense: 0 };
    if (txn.amount > 0) {
      existing.income += txn.amount;
    } else {
      existing.expense += Math.abs(txn.amount);
    }
    map.set(txn.txnDate, existing);
  }

  const result: DailySpend[] = [];
  for (const [date, data] of map) {
    result.push({
      date,
      income: round2(data.income),
      expense: round2(data.expense),
      net: round2(data.income - data.expense),
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeMonthlyTrends(transactions: Transaction[]): MonthlyTrend[] {
  if (transactions.length === 0) return [];

  const map = new Map<string, { income: number; expense: number }>();
  for (const txn of transactions) {
    const month = txn.txnDate.substring(0, 7); // YYYY-MM
    const existing = map.get(month) || { income: 0, expense: 0 };
    if (txn.amount > 0) {
      existing.income += txn.amount;
    } else {
      existing.expense += Math.abs(txn.amount);
    }
    map.set(month, existing);
  }

  const result: MonthlyTrend[] = [];
  for (const [month, data] of map) {
    result.push({
      month,
      income: round2(data.income),
      expense: round2(data.expense),
      net: round2(data.income - data.expense),
    });
  }

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

export function detectAnomalies(transactions: Transaction[]): AnomalyEntry[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length < 5) return [];

  // Compute mean and stddev per category
  const categoryStats = new Map<string, { amounts: number[] }>();
  for (const txn of expenses) {
    const existing = categoryStats.get(txn.category) || { amounts: [] };
    existing.amounts.push(Math.abs(txn.amount));
    categoryStats.set(txn.category, existing);
  }

  const anomalies: AnomalyEntry[] = [];

  for (const txn of expenses) {
    const stats = categoryStats.get(txn.category);
    if (!stats || stats.amounts.length < 3) continue;

    const mean = stats.amounts.reduce((a, b) => a + b, 0) / stats.amounts.length;
    const variance =
      stats.amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      stats.amounts.length;
    const stdDev = Math.sqrt(variance);

    const absAmount = Math.abs(txn.amount);
    if (stdDev > 0 && absAmount > mean + 2 * stdDev) {
      anomalies.push({
        date: txn.txnDate,
        merchant: txn.merchant || txn.description,
        amount: round2(absAmount),
        reason: `Unusually high for ${txn.category} (avg: $${round2(mean)}, this: $${round2(absAmount)})`,
      });
    }
  }

  return anomalies.sort((a, b) => b.amount - a.amount).slice(0, 20);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
