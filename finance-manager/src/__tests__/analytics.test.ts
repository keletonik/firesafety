import {
  computeCashflow,
  computeCategoryBreakdown,
  computeMerchantBreakdown,
  computeDailySpend,
  computeMonthlyTrends,
  detectAnomalies,
} from "@/lib/analytics";
import type { Transaction } from "@/lib/types";

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "test-" + Math.random().toString(36).slice(2),
    txnDate: "2025-01-15",
    description: "Test Transaction",
    amount: -10,
    merchant: "test merchant",
    category: "Uncategorised",
    source: "test.csv",
    importedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Analytics", () => {
  describe("computeCashflow", () => {
    it("should return zeros for empty input", () => {
      const result = computeCashflow([]);
      expect(result.incomeTotal).toBe(0);
      expect(result.expenseTotal).toBe(0);
      expect(result.netTotal).toBe(0);
      expect(result.avgDailySpend).toBe(0);
      expect(result.transactionCount).toBe(0);
    });

    it("should compute income and expense totals correctly", () => {
      const txns = [
        makeTxn({ amount: 3000, txnDate: "2025-01-01" }),
        makeTxn({ amount: -400, txnDate: "2025-01-02" }),
        makeTxn({ amount: -100, txnDate: "2025-01-03" }),
      ];

      const result = computeCashflow(txns);
      expect(result.incomeTotal).toBe(3000);
      expect(result.expenseTotal).toBe(500);
      expect(result.netTotal).toBe(2500);
      expect(result.transactionCount).toBe(3);
    });

    it("should compute average daily spend", () => {
      const txns = [
        makeTxn({ amount: -100, txnDate: "2025-01-01" }),
        makeTxn({ amount: -200, txnDate: "2025-01-10" }),
      ];

      const result = computeCashflow(txns);
      // 10 days, $300 total expenses
      expect(result.avgDailySpend).toBe(30);
    });

    it("should set period start and end dates", () => {
      const txns = [
        makeTxn({ txnDate: "2025-03-15" }),
        makeTxn({ txnDate: "2025-01-01" }),
        makeTxn({ txnDate: "2025-06-30" }),
      ];

      const result = computeCashflow(txns);
      expect(result.periodStart).toBe("2025-01-01");
      expect(result.periodEnd).toBe("2025-06-30");
    });

    it("should handle single transaction", () => {
      const txns = [makeTxn({ amount: -50, txnDate: "2025-01-01" })];
      const result = computeCashflow(txns);
      expect(result.expenseTotal).toBe(50);
      expect(result.avgDailySpend).toBe(50); // 1 day
    });
  });

  describe("computeCategoryBreakdown", () => {
    it("should return empty for no expenses", () => {
      const txns = [makeTxn({ amount: 1000 })];
      const result = computeCategoryBreakdown(txns);
      expect(result).toHaveLength(0);
    });

    it("should group expenses by category", () => {
      const txns = [
        makeTxn({ amount: -50, category: "Groceries" }),
        makeTxn({ amount: -30, category: "Groceries" }),
        makeTxn({ amount: -100, category: "Housing" }),
      ];

      const result = computeCategoryBreakdown(txns);
      expect(result).toHaveLength(2);

      const housing = result.find((c) => c.category === "Housing");
      expect(housing!.total).toBe(100);
      expect(housing!.count).toBe(1);

      const groceries = result.find((c) => c.category === "Groceries");
      expect(groceries!.total).toBe(80);
      expect(groceries!.count).toBe(2);
    });

    it("should compute percentage correctly", () => {
      const txns = [
        makeTxn({ amount: -75, category: "A" }),
        makeTxn({ amount: -25, category: "B" }),
      ];

      const result = computeCategoryBreakdown(txns);
      const catA = result.find((c) => c.category === "A");
      expect(catA!.percentage).toBe(75);
    });

    it("should sort by total descending", () => {
      const txns = [
        makeTxn({ amount: -10, category: "Small" }),
        makeTxn({ amount: -100, category: "Big" }),
        makeTxn({ amount: -50, category: "Medium" }),
      ];

      const result = computeCategoryBreakdown(txns);
      expect(result[0].category).toBe("Big");
      expect(result[1].category).toBe("Medium");
      expect(result[2].category).toBe("Small");
    });
  });

  describe("computeMerchantBreakdown", () => {
    it("should return empty for no expenses", () => {
      const result = computeMerchantBreakdown([]);
      expect(result).toHaveLength(0);
    });

    it("should aggregate by merchant", () => {
      const txns = [
        makeTxn({ amount: -20, merchant: "woolworths" }),
        makeTxn({ amount: -30, merchant: "woolworths" }),
        makeTxn({ amount: -50, merchant: "coles" }),
      ];

      const result = computeMerchantBreakdown(txns);
      expect(result).toHaveLength(2);

      const woolworths = result.find((m) => m.merchant === "woolworths");
      expect(woolworths!.total).toBe(50);
      expect(woolworths!.count).toBe(2);
    });
  });

  describe("computeDailySpend", () => {
    it("should aggregate by date", () => {
      const txns = [
        makeTxn({ amount: 1000, txnDate: "2025-01-01" }),
        makeTxn({ amount: -50, txnDate: "2025-01-01" }),
        makeTxn({ amount: -100, txnDate: "2025-01-02" }),
      ];

      const result = computeDailySpend(txns);
      expect(result).toHaveLength(2);

      const day1 = result.find((d) => d.date === "2025-01-01");
      expect(day1!.income).toBe(1000);
      expect(day1!.expense).toBe(50);
      expect(day1!.net).toBe(950);
    });

    it("should sort by date ascending", () => {
      const txns = [
        makeTxn({ txnDate: "2025-01-03" }),
        makeTxn({ txnDate: "2025-01-01" }),
      ];

      const result = computeDailySpend(txns);
      expect(result[0].date).toBe("2025-01-01");
      expect(result[1].date).toBe("2025-01-03");
    });
  });

  describe("computeMonthlyTrends", () => {
    it("should aggregate by month", () => {
      const txns = [
        makeTxn({ amount: 3000, txnDate: "2025-01-15" }),
        makeTxn({ amount: -200, txnDate: "2025-01-20" }),
        makeTxn({ amount: 3000, txnDate: "2025-02-15" }),
        makeTxn({ amount: -250, txnDate: "2025-02-20" }),
      ];

      const result = computeMonthlyTrends(txns);
      expect(result).toHaveLength(2);
      expect(result[0].month).toBe("2025-01");
      expect(result[0].income).toBe(3000);
      expect(result[0].expense).toBe(200);
    });
  });

  describe("detectAnomalies", () => {
    it("should detect unusually high transactions", () => {
      const txns = [
        makeTxn({ amount: -10, category: "Groceries", merchant: "shop a" }),
        makeTxn({ amount: -12, category: "Groceries", merchant: "shop b" }),
        makeTxn({ amount: -11, category: "Groceries", merchant: "shop c" }),
        makeTxn({ amount: -9, category: "Groceries", merchant: "shop d" }),
        makeTxn({ amount: -10, category: "Groceries", merchant: "shop e" }),
        makeTxn({ amount: -11, category: "Groceries", merchant: "shop f" }),
        makeTxn({ amount: -13, category: "Groceries", merchant: "shop g" }),
        makeTxn({ amount: -10, category: "Groceries", merchant: "shop h" }),
        makeTxn({ amount: -500, category: "Groceries", merchant: "big shop" }),
      ];

      const result = detectAnomalies(txns);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].amount).toBe(500);
    });

    it("should return empty for small datasets", () => {
      const txns = [
        makeTxn({ amount: -10 }),
        makeTxn({ amount: -100 }),
      ];

      const result = detectAnomalies(txns);
      expect(result).toHaveLength(0);
    });
  });
});
