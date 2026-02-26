import { NextResponse } from "next/server";
import { loadTransactions } from "@/lib/db";
import { detectRecurring } from "@/lib/recurring";

export async function GET() {
  try {
    const transactions = loadTransactions();
    const recurring = detectRecurring(transactions);

    return NextResponse.json({
      recurring,
      count: recurring.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recurring detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
