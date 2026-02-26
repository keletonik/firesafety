import { exportToCSV, exportToJSON } from "@/lib/export";
import type { Transaction } from "@/lib/types";

const sampleTxns: Transaction[] = [
  {
    id: "1",
    txnDate: "2025-01-01",
    description: "Salary",
    amount: 3000,
    merchant: "employer",
    category: "Income",
    source: "test.csv",
    importedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    txnDate: "2025-01-02",
    description: 'Woolworths "Town Hall"',
    amount: -50,
    merchant: "woolworths",
    category: "Groceries",
    source: "test.csv",
    importedAt: "2025-01-02T00:00:00Z",
  },
];

describe("Export", () => {
  describe("exportToCSV", () => {
    it("should produce valid CSV with headers", () => {
      const csv = exportToCSV(sampleTxns);
      const lines = csv.split("\n");
      expect(lines[0]).toBe("Date,Description,Amount,Merchant,Category,Source");
      expect(lines.length).toBe(3); // header + 2 rows
    });

    it("should escape fields with commas or quotes", () => {
      const csv = exportToCSV(sampleTxns);
      // The "Town Hall" description should be quoted
      expect(csv).toContain('"Woolworths ""Town Hall"""');
    });

    it("should handle empty array", () => {
      const csv = exportToCSV([]);
      const lines = csv.split("\n");
      expect(lines.length).toBe(1); // header only
    });

    it("should neutralise formula injection in exported fields", () => {
      const txns: Transaction[] = [
        {
          id: "3",
          txnDate: "2025-01-03",
          description: "=SUM(A1:A10)",
          amount: -10,
          merchant: "+cmd('calc')",
          category: "Uncategorised",
          source: "@malicious.csv",
          importedAt: "2025-01-03T00:00:00Z",
        },
      ];

      const csv = exportToCSV(txns);
      // Formula prefixes should be neutralised with a leading single quote
      expect(csv).toContain("'=SUM(A1:A10)");
      expect(csv).toContain("'+cmd('calc')");
      expect(csv).toContain("'@malicious.csv");
      // Should NOT start with the dangerous character directly
      expect(csv).not.toMatch(/,=SUM/);
      expect(csv).not.toMatch(/,\+cmd/);
      expect(csv).not.toMatch(/,@malicious/);
    });
  });

  describe("exportToJSON", () => {
    it("should produce valid JSON", () => {
      const jsonStr = exportToJSON(sampleTxns);
      const parsed = JSON.parse(jsonStr);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].date).toBe("2025-01-01");
      expect(parsed[0].amount).toBe(3000);
    });

    it("should not include id or importedAt", () => {
      const jsonStr = exportToJSON(sampleTxns);
      const parsed = JSON.parse(jsonStr);
      expect(parsed[0]).not.toHaveProperty("id");
      expect(parsed[0]).not.toHaveProperty("importedAt");
    });
  });
});
