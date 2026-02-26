export interface Transaction {
  id: string;
  txnDate: string; // YYYY-MM-DD
  description: string;
  amount: number; // negative = expense, positive = income
  merchant: string;
  category: string;
  source: string;
  importedAt: string; // ISO timestamp
}

export interface CategoryRule {
  id: string;
  pattern: string; // regex pattern
  category: string;
  priority: number; // lower wins
  enabled: boolean;
}

export interface ImportResult {
  transactions: Transaction[];
  warnings: string[];
  count: number;
}

export interface CashflowMetrics {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  avgDailySpend: number;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MerchantBreakdown {
  merchant: string;
  total: number;
  count: number;
}

export interface RecurringPayment {
  merchant: string;
  cadence: "weekly" | "monthly" | "annual" | "unknown";
  avgAmount: number;
  count: number;
  lastDate: string;
}

export interface AnomalyEntry {
  date: string;
  merchant: string;
  amount: number;
  reason: string;
}

export interface DailySpend {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
}

export type DateRange = {
  start: string | null;
  end: string | null;
};
