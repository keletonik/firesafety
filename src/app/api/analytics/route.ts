import { NextRequest, NextResponse } from "next/server";
import { loadTransactions } from "@/lib/db";
import {
  computeCashflow,
  computeCategoryBreakdown,
  computeMerchantBreakdown,
  computeDailySpend,
  computeMonthlyTrends,
  detectAnomalies,
} from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let transactions = loadTransactions();

    if (start) {
      transactions = transactions.filter((t) => t.txnDate >= start);
    }
    if (end) {
      transactions = transactions.filter((t) => t.txnDate <= end);
    }

    const cashflow = computeCashflow(transactions);
    const categories = computeCategoryBreakdown(transactions);
    const merchants = computeMerchantBreakdown(transactions);
    const dailySpend = computeDailySpend(transactions);
    const monthlyTrends = computeMonthlyTrends(transactions);
    const anomalies = detectAnomalies(transactions);

    return NextResponse.json({
      cashflow,
      categories,
      merchants: merchants.slice(0, 25),
      dailySpend,
      monthlyTrends,
      anomalies,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analytics computation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
