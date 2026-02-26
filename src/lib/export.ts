import type { Transaction } from "./types";

/**
 * Characters that could trigger formula execution when opened in spreadsheet software.
 * Prefixing with a single quote neutralises them.
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Sanitise a string value for safe CSV output.
 * - Escapes double quotes by doubling them
 * - Wraps in double quotes if the value contains commas, quotes, or newlines
 * - Neutralises formula injection by prefixing dangerous characters with a single quote
 */
function escapeCsvField(value: string): string {
  let safe = value;

  // Neutralise formula injection: prefix with single quote if starts with a dangerous character
  if (safe.length > 0 && FORMULA_PREFIXES.includes(safe[0])) {
    safe = `'${safe}`;
  }

  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Export transactions to CSV string
 */
export function exportToCSV(transactions: Transaction[]): string {
  const headers = ["Date", "Description", "Amount", "Merchant", "Category", "Source"];
  const rows = transactions.map((t) => [
    t.txnDate,
    escapeCsvField(t.description),
    t.amount.toFixed(2),
    escapeCsvField(t.merchant),
    escapeCsvField(t.category),
    escapeCsvField(t.source),
  ]);

  const lines = [headers.join(","), ...rows.map((r) => r.join(","))];
  return lines.join("\n");
}

/**
 * Export transactions to JSON string.
 * Strips internal IDs and timestamps for clean output.
 */
export function exportToJSON(transactions: Transaction[]): string {
  const sanitised = transactions.map((t) => ({
    date: t.txnDate,
    description: t.description,
    amount: t.amount,
    merchant: t.merchant,
    category: t.category,
    source: t.source,
  }));
  return JSON.stringify(sanitised, null, 2);
}
