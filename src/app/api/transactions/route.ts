import { NextRequest, NextResponse } from "next/server";
import { loadTransactions, clearTransactions } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const category = searchParams.get("category");
    const merchant = searchParams.get("merchant");
    const search = searchParams.get("search");

    let transactions = loadTransactions();

    // Apply filters
    if (start) {
      transactions = transactions.filter((t) => t.txnDate >= start);
    }
    if (end) {
      transactions = transactions.filter((t) => t.txnDate <= end);
    }
    if (category && category !== "all") {
      transactions = transactions.filter((t) => t.category === category);
    }
    if (merchant) {
      transactions = transactions.filter(
        (t) => t.merchant.toLowerCase().includes(merchant.toLowerCase())
      );
    }
    if (search) {
      const lowerSearch = search.toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.description.toLowerCase().includes(lowerSearch) ||
          t.merchant.toLowerCase().includes(lowerSearch) ||
          t.category.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort by date descending
    transactions.sort((a, b) => b.txnDate.localeCompare(a.txnDate));

    return NextResponse.json({
      transactions,
      count: transactions.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require explicit confirmation header to prevent accidental deletion via CSRF
    const confirmHeader = request.headers.get("X-Confirm-Delete");
    if (confirmHeader !== "true") {
      return NextResponse.json(
        { error: "Missing X-Confirm-Delete header. This action requires explicit confirmation." },
        { status: 400 }
      );
    }

    clearTransactions();
    return NextResponse.json({ message: "All transactions cleared" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
