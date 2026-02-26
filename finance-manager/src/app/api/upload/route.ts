import { NextRequest, NextResponse } from "next/server";
import { parseCSV } from "@/lib/importer";
import { categoriseTransactions, DEFAULT_RULES } from "@/lib/categoriser";
import { appendTransactions, loadRules, saveRules } from "@/lib/db";
import type { CategoryRule } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are supported in this version" },
        { status: 400 }
      );
    }

    const csvContent = await file.text();

    if (csvContent.trim().length === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // Parse CSV
    const importResult = parseCSV(csvContent, file.name);

    if (importResult.transactions.length === 0) {
      return NextResponse.json(
        {
          error: "No valid transactions found in file",
          warnings: importResult.warnings,
        },
        { status: 400 }
      );
    }

    // Ensure rules exist
    let rules: CategoryRule[] = loadRules();
    if (rules.length === 0) {
      rules = DEFAULT_RULES;
      saveRules(rules);
    }

    // Categorise
    const categorised = categoriseTransactions(importResult.transactions, rules);

    // Persist
    const totalCount = appendTransactions(categorised);

    return NextResponse.json({
      imported: categorised.length,
      totalTransactions: totalCount,
      warnings: importResult.warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
