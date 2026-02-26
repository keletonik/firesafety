"use client";

import { usePathname } from "next/navigation";
import { Download } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "Overview of your financial health",
  },
  "/upload": {
    title: "Import Data",
    subtitle: "Upload bank statement CSVs",
  },
  "/transactions": {
    title: "Transactions",
    subtitle: "Browse and search all transactions",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Category and merchant breakdown",
  },
  "/recurring": {
    title: "Recurring Payments",
    subtitle: "Detected subscriptions and recurring charges",
  },
};

export default function TopBar() {
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: "Finance Manager", subtitle: "" };

  const handleExportCSV = () => {
    window.open("/api/export?format=csv", "_blank");
  };

  const handleExportJSON = () => {
    window.open("/api/export?format=json", "_blank");
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {page.title}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{page.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="btn-secondary text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>
    </header>
  );
}
