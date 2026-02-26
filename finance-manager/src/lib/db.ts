import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { Transaction, CategoryRule } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");
const RULES_FILE = path.join(DATA_DIR, "rules.json");

function ensureDataDir(): void {
  const fs = require("fs");
  if (!existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Transaction storage
export function loadTransactions(): Transaction[] {
  ensureDataDir();
  if (!existsSync(TRANSACTIONS_FILE)) {
    return [];
  }
  const raw = readFileSync(TRANSACTIONS_FILE, "utf-8");
  return JSON.parse(raw) as Transaction[];
}

export function saveTransactions(txns: Transaction[]): void {
  ensureDataDir();
  writeFileSync(TRANSACTIONS_FILE, JSON.stringify(txns, null, 2), "utf-8");
}

export function appendTransactions(newTxns: Transaction[]): number {
  const existing = loadTransactions();
  const combined = [...existing, ...newTxns];
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
  if (!existsSync(RULES_FILE)) {
    return [];
  }
  const raw = readFileSync(RULES_FILE, "utf-8");
  return JSON.parse(raw) as CategoryRule[];
}

export function saveRules(rules: CategoryRule[]): void {
  ensureDataDir();
  writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), "utf-8");
}
