import { NextRequest, NextResponse } from "next/server";
import { loadTransactions } from "@/lib/db";
import { exportToCSV, exportToJSON } from "@/lib/export";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let transactions = loadTransactions();

    if (start) {
      transactions = transactions.filter((t) => t.txnDate >= start);
    }
    if (end) {
      transactions = transactions.filter((t) => t.txnDate <= end);
    }

    if (format === "json") {
      const jsonContent = exportToJSON(transactions);
      return new NextResponse(jsonContent, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="transactions_export.json"`,
        },
      });
    }

    const csvContent = exportToCSV(transactions);
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="transactions_export.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
