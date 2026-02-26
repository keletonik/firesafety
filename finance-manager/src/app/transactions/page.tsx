"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatDate, cn, getCategoryColor } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setTransactions(json.transactions);

      // Extract unique categories
      const cats = [
        ...new Set(json.transactions.map((t: Transaction) => t.category)),
      ] as string[];
      cats.sort();
      setCategories(cats);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(debounce);
  }, [fetchTransactions]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  const totalPages = Math.ceil(transactions.length / perPage);
  const displayed = transactions.slice((page - 1) * perPage, page * perPage);

  if (loading && transactions.length === 0) return <LoadingSpinner />;

  if (!loading && transactions.length === 0 && !search && categoryFilter === "all") {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field pl-9 pr-8 appearance-none min-w-[180px]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="text-xs text-slate-500">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="card table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Merchant</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((txn) => (
              <tr key={txn.id}>
                <td className="tabular-nums whitespace-nowrap text-slate-600">
                  {formatDate(txn.txnDate)}
                </td>
                <td className="max-w-[300px] truncate" title={txn.description}>
                  {txn.description}
                </td>
                <td className="capitalize text-slate-600 max-w-[200px] truncate">
                  {txn.merchant}
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getCategoryColor(txn.category) + "15",
                      color: getCategoryColor(txn.category),
                      borderColor: getCategoryColor(txn.category) + "30",
                    }}
                  >
                    {txn.category}
                  </span>
                </td>
                <td
                  className={cn(
                    "text-right tabular-nums font-medium whitespace-nowrap",
                    txn.amount >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {txn.amount >= 0 ? "+" : ""}
                  {formatCurrency(txn.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            No transactions match your search.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
