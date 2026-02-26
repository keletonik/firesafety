import {
  categoriseTransaction,
  categoriseTransactions,
  DEFAULT_RULES,
} from "@/lib/categoriser";
import type { Transaction } from "@/lib/types";

describe("Categoriser", () => {
  describe("categoriseTransaction", () => {
    it("should categorise Woolworths as Groceries", () => {
      const result = categoriseTransaction("Woolworths Town Hall", DEFAULT_RULES);
      expect(result).toBe("Groceries");
    });

    it("should categorise Coles as Groceries", () => {
      const result = categoriseTransaction("COLES SUPERMARKET 4521", DEFAULT_RULES);
      expect(result).toBe("Groceries");
    });

    it("should categorise Aldi as Groceries", () => {
      const result = categoriseTransaction("ALDI STORE 123", DEFAULT_RULES);
      expect(result).toBe("Groceries");
    });

    it("should categorise Netflix as Subscriptions", () => {
      const result = categoriseTransaction("NETFLIX.COM", DEFAULT_RULES);
      expect(result).toBe("Subscriptions");
    });

    it("should categorise Spotify as Subscriptions", () => {
      const result = categoriseTransaction("SPOTIFY PREMIUM", DEFAULT_RULES);
      expect(result).toBe("Subscriptions");
    });

    it("should categorise Uber as Transport", () => {
      const result = categoriseTransaction("UBER *TRIP ABC123", DEFAULT_RULES);
      expect(result).toBe("Transport");
    });

    it("should categorise Uber Eats as Food Delivery", () => {
      const result = categoriseTransaction("UBER EATS ORDER", DEFAULT_RULES);
      expect(result).toBe("Food Delivery");
    });

    it("should categorise rent payment", () => {
      const result = categoriseTransaction("RENT PAYMENT - LANDLORD", DEFAULT_RULES);
      expect(result).toBe("Housing");
    });

    it("should categorise cafe/restaurant as Eating Out", () => {
      const result = categoriseTransaction("THE COFFEE CLUB", DEFAULT_RULES);
      expect(result).toBe("Eating Out");
    });

    it("should categorise salary as Income", () => {
      const result = categoriseTransaction("SALARY DEPOSIT EMPLOYER", DEFAULT_RULES);
      expect(result).toBe("Income");
    });

    it("should return Uncategorised for unknown descriptions", () => {
      const result = categoriseTransaction("RANDOM UNKNOWN PURCHASE XYZ", DEFAULT_RULES);
      expect(result).toBe("Uncategorised");
    });

    it("should be case-insensitive", () => {
      const result = categoriseTransaction("woolworths", DEFAULT_RULES);
      expect(result).toBe("Groceries");
    });

    it("should respect priority (lower wins)", () => {
      // Uber Eats should match Food Delivery (priority 12) before Transport (priority 20)
      const result = categoriseTransaction("UBER EATS DELIVERY", DEFAULT_RULES);
      expect(result).toBe("Food Delivery");
    });

    it("should handle empty rules list", () => {
      const result = categoriseTransaction("Woolworths", []);
      expect(result).toBe("Uncategorised");
    });

    it("should skip disabled rules", () => {
      const disabledRules = DEFAULT_RULES.map((r) => ({ ...r, enabled: false }));
      const result = categoriseTransaction("Woolworths", disabledRules);
      expect(result).toBe("Uncategorised");
    });
  });

  describe("categoriseTransactions", () => {
    it("should categorise a batch of transactions", () => {
      const txns: Transaction[] = [
        {
          id: "1",
          txnDate: "2025-01-01",
          description: "Woolworths Town Hall",
          amount: -50,
          merchant: "woolworths",
          category: "Uncategorised",
          source: "test",
          importedAt: new Date().toISOString(),
        },
        {
          id: "2",
          txnDate: "2025-01-02",
          description: "NETFLIX.COM",
          amount: -15.99,
          merchant: "netflix",
          category: "Uncategorised",
          source: "test",
          importedAt: new Date().toISOString(),
        },
        {
          id: "3",
          txnDate: "2025-01-03",
          description: "Salary Payment",
          amount: 3000,
          merchant: "salary",
          category: "Uncategorised",
          source: "test",
          importedAt: new Date().toISOString(),
        },
      ];

      const result = categoriseTransactions(txns, DEFAULT_RULES);

      expect(result[0].category).toBe("Groceries");
      expect(result[1].category).toBe("Subscriptions");
      expect(result[2].category).toBe("Income");
    });

    it("should preserve other transaction fields", () => {
      const txns: Transaction[] = [
        {
          id: "test-id",
          txnDate: "2025-06-15",
          description: "Woolworths",
          amount: -25,
          merchant: "woolworths",
          category: "Uncategorised",
          source: "mybank.csv",
          importedAt: "2025-06-15T00:00:00Z",
        },
      ];

      const result = categoriseTransactions(txns, DEFAULT_RULES);
      expect(result[0].id).toBe("test-id");
      expect(result[0].amount).toBe(-25);
      expect(result[0].source).toBe("mybank.csv");
    });
  });
});
