import { detectRecurring } from "@/lib/recurring";
import type { Transaction } from "@/lib/types";

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "test-" + Math.random().toString(36).slice(2),
    txnDate: "2025-01-01",
    description: "Test",
    amount: -10,
    merchant: "test merchant",
    category: "Uncategorised",
    source: "test.csv",
    importedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Recurring Detection", () => {
  it("should return empty for no transactions", () => {
    const result = detectRecurring([]);
    expect(result).toHaveLength(0);
  });

  it("should not flag merchants with fewer than 3 transactions", () => {
    const txns = [
      makeTxn({ merchant: "netflix", txnDate: "2025-01-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-02-01", amount: -15.99 }),
    ];

    const result = detectRecurring(txns);
    expect(result).toHaveLength(0);
  });

  it("should detect monthly recurring payments", () => {
    const txns = [
      makeTxn({ merchant: "netflix", txnDate: "2025-01-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-02-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-03-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-04-01", amount: -15.99 }),
    ];

    const result = detectRecurring(txns);
    expect(result.length).toBeGreaterThan(0);

    const netflix = result.find((r) => r.merchant === "netflix");
    expect(netflix).toBeDefined();
    expect(netflix!.cadence).toBe("monthly");
    expect(netflix!.avgAmount).toBeCloseTo(15.99, 1);
    expect(netflix!.count).toBe(4);
  });

  it("should detect weekly recurring payments", () => {
    const txns = [
      makeTxn({ merchant: "gym", txnDate: "2025-01-07", amount: -20 }),
      makeTxn({ merchant: "gym", txnDate: "2025-01-14", amount: -20 }),
      makeTxn({ merchant: "gym", txnDate: "2025-01-21", amount: -20 }),
      makeTxn({ merchant: "gym", txnDate: "2025-01-28", amount: -20 }),
    ];

    const result = detectRecurring(txns);
    const gym = result.find((r) => r.merchant === "gym");
    expect(gym).toBeDefined();
    expect(gym!.cadence).toBe("weekly");
  });

  it("should only consider expense transactions", () => {
    const txns = [
      makeTxn({ merchant: "salary", txnDate: "2025-01-01", amount: 3000 }),
      makeTxn({ merchant: "salary", txnDate: "2025-02-01", amount: 3000 }),
      makeTxn({ merchant: "salary", txnDate: "2025-03-01", amount: 3000 }),
    ];

    const result = detectRecurring(txns);
    expect(result).toHaveLength(0);
  });

  it("should set lastDate to the most recent transaction date", () => {
    const txns = [
      makeTxn({ merchant: "netflix", txnDate: "2025-01-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-02-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-03-01", amount: -15.99 }),
    ];

    const result = detectRecurring(txns);
    const netflix = result.find((r) => r.merchant === "netflix");
    expect(netflix!.lastDate).toBe("2025-03-01");
  });

  it("should handle mixed cadences across merchants", () => {
    const txns = [
      // Monthly Netflix
      makeTxn({ merchant: "netflix", txnDate: "2025-01-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-02-01", amount: -15.99 }),
      makeTxn({ merchant: "netflix", txnDate: "2025-03-01", amount: -15.99 }),
      // Weekly gym
      makeTxn({ merchant: "gym", txnDate: "2025-01-07", amount: -20 }),
      makeTxn({ merchant: "gym", txnDate: "2025-01-14", amount: -20 }),
      makeTxn({ merchant: "gym", txnDate: "2025-01-21", amount: -20 }),
    ];

    const result = detectRecurring(txns);
    expect(result.length).toBe(2);

    // Weekly should come first (cadence order)
    expect(result[0].cadence).toBe("weekly");
    expect(result[1].cadence).toBe("monthly");
  });
});
