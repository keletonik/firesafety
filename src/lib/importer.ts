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
  "memo",
];

const AMOUNT_CANDIDATES = ["amount", "amt", "value", "transaction amount"];

const DEBIT_CANDIDATES = ["debit", "withdrawal", "money_out", "money out", "withdrawals"];

const CREDIT_CANDIDATES = ["credit", "deposit", "money_in", "money in", "deposits"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function findColumn(
  headers: string[],
  candidates: string[]
): string | null {
  const normalised: Record<string, string> = {};
  for (const h of headers) {
    // Strip BOM, normalise whitespace/underscores, lowercase
    const key = h
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, " ");
    normalised[key] = h;
  }
  for (const cand of candidates) {
    const normCand = cand.trim().toLowerCase().replace(/[_\s]+/g, " ");
    if (normalised[normCand]) {
      return normalised[normCand];
    }
  }
  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  // Use Date constructor to validate day count for the given month/year
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

function formatDateParts(
  y: string,
  m: string,
  d: string
): string | null {
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (!isValidDate(year, month, day)) return null;
  return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseDate(value: string, ambiguousCount: { value: number }): string | null {
  if (!value || value.trim() === "") return null;

  const trimmed = value.trim();

  // Try ISO format: YYYY-MM-DD (allow trailing time component)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s|T|$)/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return formatDateParts(y, m, d);
  }

  // Try DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (slashMatch) {
    const [, a, b, y] = slashMatch;
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    // If first number > 12, it must be day (DD/MM/YYYY)
    if (aNum > 12) {
      return formatDateParts(y, b, a);
    }
    // If second number > 12, it must be day (MM/DD/YYYY)
    if (bNum > 12) {
      return formatDateParts(y, a, b);
    }
    // Ambiguous: both <= 12 — default to DD/MM/YYYY (AU convention)
    ambiguousCount.value++;
    return formatDateParts(y, b, a);
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
      return formatDateParts(year, b, a);
    }
    if (bNum > 12) {
      return formatDateParts(year, a, b);
    }
    ambiguousCount.value++;
    return formatDateParts(year, b, a);
  }

  return null;
}

function parseAmount(value: string): number | null {
  if (!value || value.trim() === "") return null;
  // Remove currency symbols (broad Unicode support) and commas
  const cleaned = value.trim().replace(/[$£€¥₹₽₩₪,\s]/g, "");
  // Handle parentheses as negative
  const parenMatch = cleaned.match(/^\((.+)\)$/);
  const raw = parenMatch ? parenMatch[1] : cleaned;

  // Strict validation: only allow numeric values (no scientific notation, no trailing chars)
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;

  const num = parseFloat(raw);
  if (!Number.isFinite(num)) return null;
  return parenMatch ? -Math.abs(num) : num;
}

/**
 * Sanitise cell values to prevent CSV injection.
 * Strips leading formula characters (=, +, @, \t, \r).
 * Does NOT strip leading `-` since negative amounts are common in descriptions.
 */
function sanitizeCell(value: string): string {
  const dangerous = ["=", "+", "@", "\t", "\r"];
  let result = value;
  while (result.length > 0 && dangerous.includes(result[0])) {
    result = result.substring(1);
  }
  return result.trim();
}

function extractMerchant(description: string): string {
  let merchant = description.toLowerCase();
  merchant = merchant.replace(/\d+/g, "");
  merchant = merchant.replace(/[*#]/g, "");
  merchant = merchant.replace(/\s+/g, " ").trim();
  if (!merchant) return "unknown merchant";
  return merchant.substring(0, 60);
}

export function parseCSV(csvContent: string, sourceName: string): ImportResult {
  const warnings: string[] = [];

  // File size guard
  if (csvContent.length > MAX_FILE_SIZE) {
    return {
      transactions: [],
      warnings: ["File exceeds 10MB size limit. Please split into smaller files."],
      count: 0,
    };
  }

  // Strip BOM
  const cleanContent = csvContent.replace(/^\uFEFF/, "");

  const parsed = Papa.parse<RawRow>(cleanContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    const significantErrors = parsed.errors.slice(0, 5);
    if (significantErrors.length > 0) {
      warnings.push(
        `CSV parsing issues: ${significantErrors.map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`).join("; ")}`
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
  const ambiguousDateCount = { value: 0 };

  // Sanitise source name
  const safeSource = sourceName.replace(/[^a-zA-Z0-9._\-\s]/g, "_").substring(0, 100);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const dateStr = parseDate(row[dateCol], ambiguousDateCount);
    if (!dateStr) {
      skipped++;
      continue;
    }

    const rawDesc = (row[descCol] || "").trim();
    const description = sanitizeCell(rawDesc);
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
    } else if (debitCol && creditCol) {
      const debitRaw = parseAmount(row[debitCol]);
      const creditRaw = parseAmount(row[creditCol]);
      if (debitRaw === null && creditRaw === null) {
        skipped++;
        continue;
      }
      const debit = debitRaw ?? 0;
      const credit = creditRaw ?? 0;
      if (debit === 0 && credit === 0) {
        skipped++;
        continue;
      }
      amount = credit - Math.abs(debit);
    }

    if (amount === null) {
      skipped++;
      continue;
    }

    transactions.push({
      id: uuidv4(),
      txnDate: dateStr,
      description,
      amount,
      merchant: extractMerchant(description),
      category: "Uncategorised",
      source: safeSource,
      importedAt: now,
    });
  }

  if (skipped > 0) {
    warnings.push(`${skipped} row(s) were skipped due to invalid or missing data.`);
  }

  if (ambiguousDateCount.value > 0) {
    warnings.push(
      `${ambiguousDateCount.value} date(s) were ambiguous (DD/MM vs MM/DD). DD/MM/YYYY format was assumed.`
    );
  }

  // Sort by date
  transactions.sort((a, b) => a.txnDate.localeCompare(b.txnDate));

  return {
    transactions,
    warnings,
    count: transactions.length,
  };
}
