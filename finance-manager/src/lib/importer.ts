import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import type { Transaction, ImportResult } from "./types";

interface RawRow {
  [key: string]: string;
}

const DATE_CANDIDATES = [
  "date",
  "transaction_date",
  "txn_date",
  "posted_date",
  "transaction date",
  "posting date",
  "value date",
];

const DESC_CANDIDATES = [
  "description",
  "desc",
  "merchant",
  "narrative",
  "details",
  "transaction description",
  "payee",
  "name",
  "memo",
  "reference",
];

const AMOUNT_CANDIDATES = ["amount", "amt", "value", "transaction amount"];

const DEBIT_CANDIDATES = ["debit", "withdrawal", "money_out", "money out", "withdrawals"];

const CREDIT_CANDIDATES = ["credit", "deposit", "money_in", "money in", "deposits"];

function findColumn(
  headers: string[],
  candidates: string[]
): string | null {
  const normalised: Record<string, string> = {};
  for (const h of headers) {
    normalised[h.trim().toLowerCase().replace(/[_\s]+/g, " ")] = h;
  }
  for (const cand of candidates) {
    const normCand = cand.trim().toLowerCase().replace(/[_\s]+/g, " ");
    if (normalised[normCand]) {
      return normalised[normCand];
    }
  }
  return null;
}

function parseDate(value: string): string | null {
  if (!value || value.trim() === "") return null;

  const trimmed = value.trim();

  // Try ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashMatch) {
    const [, a, b, y] = slashMatch;
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    // If first number > 12, it must be day (DD/MM/YYYY)
    if (aNum > 12) {
      return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    }
    // If second number > 12, it must be day (MM/DD/YYYY)
    if (bNum > 12) {
      return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }
    // Ambiguous — default to MM/DD/YYYY (US convention)
    return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }

  // Try DD/MM/YY or MM/DD/YY
  const shortYearMatch = trimmed.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/
  );
  if (shortYearMatch) {
    const [, a, b, yy] = shortYearMatch;
    const year = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    if (aNum > 12) {
      return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    }
    if (bNum > 12) {
      return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }
    return `${year}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }

  return null;
}

function parseAmount(value: string): number | null {
  if (!value || value.trim() === "") return null;
  // Remove currency symbols and commas
  const cleaned = value.trim().replace(/[$£€¥,\s]/g, "");
  // Handle parentheses as negative
  const parenMatch = cleaned.match(/^\((.+)\)$/);
  if (parenMatch) {
    const num = parseFloat(parenMatch[1]);
    return isNaN(num) ? null : -num;
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractMerchant(description: string): string {
  // Remove digits, collapse whitespace, lowercase, trim
  let merchant = description.toLowerCase();
  merchant = merchant.replace(/\d+/g, "");
  merchant = merchant.replace(/[*#]/g, "");
  merchant = merchant.replace(/\s+/g, " ").trim();
  // Cap at 60 chars
  return merchant.substring(0, 60);
}

export function parseCSV(csvContent: string, sourceName: string): ImportResult {
  const warnings: string[] = [];

  const parsed = Papa.parse<RawRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    const criticalErrors = parsed.errors.filter(
      (e) => e.type === "Delimiter" || e.type === "FieldMismatch"
    );
    if (criticalErrors.length > 0) {
      warnings.push(
        `CSV parsing warnings: ${criticalErrors.map((e) => e.message).join("; ")}`
      );
    }
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return { transactions: [], warnings: ["CSV file is empty or has no data rows."], count: 0 };
  }

  const headers = Object.keys(rows[0]);

  const dateCol = findColumn(headers, DATE_CANDIDATES);
  const descCol = findColumn(headers, DESC_CANDIDATES);
  const amountCol = findColumn(headers, AMOUNT_CANDIDATES);
  const debitCol = findColumn(headers, DEBIT_CANDIDATES);
  const creditCol = findColumn(headers, CREDIT_CANDIDATES);

  if (!dateCol) {
    return {
      transactions: [],
      warnings: [`Could not detect a date column. Found columns: ${headers.join(", ")}`],
      count: 0,
    };
  }

  if (!descCol) {
    return {
      transactions: [],
      warnings: [`Could not detect a description column. Found columns: ${headers.join(", ")}`],
      count: 0,
    };
  }

  if (!amountCol && (!debitCol || !creditCol)) {
    return {
      transactions: [],
      warnings: [
        "Could not detect amount column. Need either 'amount' OR both 'debit' and 'credit'.",
      ],
      count: 0,
    };
  }

  const transactions: Transaction[] = [];
  let skipped = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const dateStr = parseDate(row[dateCol!]);
    if (!dateStr) {
      skipped++;
      continue;
    }

    const description = (row[descCol!] || "").trim();
    if (!description) {
      skipped++;
      continue;
    }

    let amount: number | null = null;

    if (amountCol) {
      amount = parseAmount(row[amountCol]);
      if (amount === null) {
        skipped++;
        continue;
      }
    } else {
      const debit = parseAmount(row[debitCol!]) || 0;
      const credit = parseAmount(row[creditCol!]) || 0;
      if (debit === 0 && credit === 0) {
        skipped++;
        continue;
      }
      amount = credit - Math.abs(debit);
    }

    transactions.push({
      id: uuidv4(),
      txnDate: dateStr,
      description,
      amount,
      merchant: extractMerchant(description),
      category: "Uncategorised",
      source: sourceName,
      importedAt: now,
    });
  }

  if (skipped > 0) {
    warnings.push(`${skipped} row(s) were skipped due to invalid or missing data.`);
  }

  // Sort by date
  transactions.sort((a, b) => a.txnDate.localeCompare(b.txnDate));

  return {
    transactions,
    warnings,
    count: transactions.length,
  };
}
