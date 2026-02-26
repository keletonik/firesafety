import { parseCSV } from "@/lib/importer";

describe("CSV Importer", () => {
  it("should parse a basic CSV with date, description, amount columns", () => {
    const csv = `date,description,amount
2025-01-01,Salary,2000
2025-01-02,Woolworths Town Hall,-50
2025-01-03,Coffee Shop,-4.50`;

    const result = parseCSV(csv, "test.csv");

    expect(result.count).toBe(3);
    expect(result.transactions).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);

    // Check salary
    const salary = result.transactions.find((t) => t.description === "Salary");
    expect(salary).toBeDefined();
    expect(salary!.amount).toBe(2000);
    expect(salary!.txnDate).toBe("2025-01-01");

    // Check expense
    const woolworths = result.transactions.find((t) =>
      t.description.includes("Woolworths")
    );
    expect(woolworths).toBeDefined();
    expect(woolworths!.amount).toBe(-50);
  });

  it("should handle debit/credit column format", () => {
    const csv = `date,description,debit,credit
2025-01-01,Salary,,3000
2025-01-02,Rent,1200,
2025-01-03,Groceries,85.50,`;

    const result = parseCSV(csv, "debit-credit.csv");

    expect(result.count).toBe(3);

    const salary = result.transactions.find((t) => t.description === "Salary");
    expect(salary!.amount).toBe(3000);

    const rent = result.transactions.find((t) => t.description === "Rent");
    expect(rent!.amount).toBe(-1200);
  });

  it("should handle empty CSV", () => {
    const csv = "";
    const result = parseCSV(csv, "empty.csv");
    expect(result.count).toBe(0);
    expect(result.transactions).toHaveLength(0);
  });

  it("should handle CSV with headers only", () => {
    const csv = "date,description,amount\n";
    const result = parseCSV(csv, "headers-only.csv");
    expect(result.count).toBe(0);
  });

  it("should warn about missing date column", () => {
    const csv = `foo,bar,baz
1,2,3`;
    const result = parseCSV(csv, "bad-headers.csv");
    expect(result.count).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("date column");
  });

  it("should handle various date formats", () => {
    const csv = `date,description,amount
2025-01-15,ISO Format,-10
15/01/2025,DD/MM/YYYY,-20
01/15/2025,MM/DD/YYYY,-30`;

    const result = parseCSV(csv, "dates.csv");
    expect(result.count).toBe(3);

    // ISO is straightforward
    expect(result.transactions[0].txnDate).toBe("2025-01-15");
  });

  it("should skip rows with missing data and warn", () => {
    const csv = `date,description,amount
2025-01-01,Valid Transaction,-50
,Missing Date,-20
2025-01-03,,-30
2025-01-04,Missing Amount,`;

    const result = parseCSV(csv, "partial.csv");
    expect(result.count).toBe(1);
    expect(result.warnings.some((w) => w.includes("skipped"))).toBe(true);
  });

  it("should handle currency symbols in amounts", () => {
    const csv = `date,description,amount
2025-01-01,Test One,"$1,200.50"
2025-01-02,Test Two,-$45.00`;

    const result = parseCSV(csv, "currency.csv");
    expect(result.count).toBe(2);
    expect(result.transactions[0].amount).toBe(1200.5);
    expect(result.transactions[1].amount).toBe(-45);
  });

  it("should sort transactions by date", () => {
    const csv = `date,description,amount
2025-03-01,Third,-10
2025-01-01,First,-20
2025-02-01,Second,-30`;

    const result = parseCSV(csv, "unsorted.csv");
    expect(result.transactions[0].txnDate).toBe("2025-01-01");
    expect(result.transactions[1].txnDate).toBe("2025-02-01");
    expect(result.transactions[2].txnDate).toBe("2025-03-01");
  });

  it("should extract merchant from description", () => {
    const csv = `date,description,amount
2025-01-01,WOOLWORTHS 1234 TOWN HALL,-50`;

    const result = parseCSV(csv, "merchant.csv");
    expect(result.transactions[0].merchant).toBeTruthy();
    expect(result.transactions[0].merchant).not.toContain("1234");
  });

  it("should generate unique IDs for each transaction", () => {
    const csv = `date,description,amount
2025-01-01,Test,-10
2025-01-01,Test,-10`;

    const result = parseCSV(csv, "dupes.csv");
    expect(result.transactions[0].id).not.toBe(result.transactions[1].id);
  });

  it("should reject invalid calendar dates like Feb 30", () => {
    const csv = `date,description,amount
2025-02-30,Invalid Date,-10
2025-13-01,Bad Month,-20
2025-01-32,Bad Day,-30
2025-01-15,Valid Date,-40`;

    const result = parseCSV(csv, "bad-dates.csv");
    expect(result.count).toBe(1);
    expect(result.transactions[0].txnDate).toBe("2025-01-15");
    expect(result.warnings.some((w) => w.includes("skipped"))).toBe(true);
  });

  it("should sanitise CSV injection characters in descriptions", () => {
    const csv = `date,description,amount
2025-01-01,=SUM(A1:A10),-10
2025-01-02,+cmd('calc'),-20
2025-01-03,@malicious,-30`;

    const result = parseCSV(csv, "injection.csv");
    expect(result.count).toBe(3);
    // Dangerous leading characters should be stripped
    for (const txn of result.transactions) {
      expect(txn.description[0]).not.toBe("=");
      expect(txn.description[0]).not.toBe("+");
      expect(txn.description[0]).not.toBe("@");
    }
  });

  it("should reject files exceeding size limit", () => {
    // Build a string larger than 10MB
    const bigContent = "date,description,amount\n" + "2025-01-01,Test,-10\n".repeat(600000);
    const result = parseCSV(bigContent, "huge.csv");
    expect(result.count).toBe(0);
    expect(result.warnings.some((w) => w.includes("10MB"))).toBe(true);
  });

  it("should reject scientific notation and Infinity in amounts", () => {
    const csv = `date,description,amount
2025-01-01,Normal,-50
2025-01-02,SciNotation,1e5
2025-01-03,Infinity,Infinity`;

    const result = parseCSV(csv, "bad-amounts.csv");
    expect(result.count).toBe(1);
    expect(result.transactions[0].amount).toBe(-50);
  });

  it("should handle BOM-prefixed CSV files", () => {
    const csv = `\uFEFFdate,description,amount
2025-01-01,Test,-10`;

    const result = parseCSV(csv, "bom.csv");
    expect(result.count).toBe(1);
  });

  it("should return 'unknown merchant' for descriptions with only numbers", () => {
    const csv = `date,description,amount
2025-01-01,12345678,-50`;

    const result = parseCSV(csv, "numeric-desc.csv");
    expect(result.count).toBe(1);
    expect(result.transactions[0].merchant).toBe("unknown merchant");
  });
});
