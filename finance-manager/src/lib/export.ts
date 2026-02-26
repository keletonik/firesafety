import type { Transaction } from "./types";

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
 * Export transactions to JSON string
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

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
