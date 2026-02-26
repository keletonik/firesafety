import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  return value < 0 ? `-${formatted}` : formatted;
}

export function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    Groceries: "#22c55e",
    Transport: "#3b82f6",
    Subscriptions: "#a855f7",
    Housing: "#f97316",
    Insurance: "#06b6d4",
    "Health & Fitness": "#ec4899",
    "Eating Out": "#ef4444",
    "Food Delivery": "#f59e0b",
    Income: "#16a34a",
    Utilities: "#64748b",
    "Phone & Internet": "#8b5cf6",
    Shopping: "#e11d48",
    Fuel: "#d97706",
    Medical: "#0ea5e9",
    Transfers: "#94a3b8",
    Cash: "#78716c",
    "Fees & Charges": "#dc2626",
    Uncategorised: "#9ca3af",
  };
  return colorMap[category] || "#6b7280";
}

export const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#64748b",
  "#8b5cf6",
  "#14b8a6",
  "#e11d48",
];
