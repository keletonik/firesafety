"use client";

import Link from "next/link";
import { Upload, FileSpreadsheet } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  showUploadLink?: boolean;
}

export default function EmptyState({
  title = "No data yet",
  message = "Upload a bank statement CSV to get started with your financial analysis.",
  showUploadLink = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <FileSpreadsheet className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 text-center max-w-md mb-6">
        {message}
      </p>
      {showUploadLink && (
        <Link href="/upload" className="btn-primary">
          <Upload className="w-4 h-4" />
          Import CSV
        </Link>
      )}
    </div>
  );
}
