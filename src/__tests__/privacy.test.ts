import { redactAccountNumbers, sanitiseDescription } from "@/lib/privacy";

describe("Privacy Utilities", () => {
  describe("redactAccountNumbers", () => {
    it("should redact long numeric sequences", () => {
      const result = redactAccountNumbers("Account 123456789012");
      expect(result).toContain("****9012");
      expect(result).not.toContain("12345678");
    });

    it("should not redact short numbers (4 digits or fewer)", () => {
      const result = redactAccountNumbers("Transaction #1234");
      expect(result).toContain("1234");
    });

    it("should preserve decimal amounts", () => {
      const result = redactAccountNumbers("Amount: 1234.56");
      // Should not be redacted since it contains a decimal
      expect(result).toContain("1234.56");
    });
  });

  describe("sanitiseDescription", () => {
    it("should redact email addresses", () => {
      const result = sanitiseDescription("Payment to user@example.com for invoice");
      expect(result).not.toContain("user@example.com");
      expect(result).toContain("[email]");
    });

    it("should handle descriptions without sensitive data", () => {
      const result = sanitiseDescription("WOOLWORTHS TOWN HALL");
      expect(result).toBe("WOOLWORTHS TOWN HALL");
    });
  });
});
