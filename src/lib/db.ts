import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type { Transaction, CategoryRule } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");
const RULES_FILE = path.join(DATA_DIR, "rules.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Safely read and parse a JSON file.
 * Returns fallback value if the file is missing, empty, or contains invalid JSON.
 */
function safeReadJSON<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  try {
    const raw = readFileSync(filePath, "utf-8").trim();
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted JSON — return fallback rather than crashing
    return fallback;
  }
}

// Transaction storage
export function loadTransactions(): Transaction[] {
  ensureDataDir();
  return safeReadJSON<Transaction[]>(TRANSACTIONS_FILE, []);
}

export function saveTransactions(txns: Transaction[]): void {
  ensureDataDir();
  writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txns, null, 2), "utf-8");
}

export function appendTransactions(newTxns: Transaction[]): number {
  const existing = loadTransactions();

  // Deduplicate: skip transactions that match an existing one on date + description + amount
  const existingKeys = new Set(
    existing.map((t) => `${t.txnDate}|${t.description}|${t.amount}`)
  );

  const unique = newTxns.filter((t) => {
    const key = `${t.txnDate}|${t.description}|${t.amount}`;
    return !existingKeys.has(key);
  });

  if (unique.length === 0) return existing.length;

  const combined = [...existing, ...unique];
  saveTransactions(combined);
  return combined.length;
}

export function clearTransactions(): void {
  ensureDataDir();
  writeFileSync(TRANSACTIONS_FILE, "[]", "utf-8");
}

// Category rules storage
export function loadRules(): CategoryRule[] {
  ensureDataDir();
  return safeReadJSON<CategoryRule[]>(RULES_FILE, []);
}

export function saveRules(rules: CategoryRule[]): void {
  ensureDataDir();
  writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), "utf-8");
}
