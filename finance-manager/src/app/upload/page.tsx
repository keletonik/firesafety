"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UploadStatus = "idle" | "dragging" | "uploading" | "success" | "error";

interface UploadResult {
  imported: number;
  totalTransactions: number;
  warnings: string[];
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [clearing, setClearing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus("dragging");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus("idle");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith(".csv")) {
        setSelectedFile(file);
        setResult(null);
        setErrorMsg("");
      } else {
        setErrorMsg("Only CSV files are supported in this version.");
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setSelectedFile(files[0]);
        setResult(null);
        setErrorMsg("");
      }
    },
    []
  );

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setErrorMsg("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error || "Upload failed");
        return;
      }

      setStatus("success");
      setResult(json);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleClearData = async () => {
    if (!confirm("This will permanently delete all imported transactions. Continue?")) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/transactions", { method: "DELETE" });
      if (res.ok) {
        setResult(null);
        setSelectedFile(null);
        setStatus("idle");
      }
    } catch {
      // Ignore errors silently
    } finally {
      setClearing(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMsg("");
    setStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Upload Zone */}
      <div className="card p-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200",
            status === "dragging"
              ? "border-blue-400 bg-blue-50/50"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                status === "dragging"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {status === "dragging"
                  ? "Drop your CSV here"
                  : "Drag & drop your bank statement CSV"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                or click to browse files
              </p>
            </div>
          </div>
        </div>

        {/* Selected file */}
        {selectedFile && status !== "success" && (
          <div className="mt-4 flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetUpload();
                }}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Import button */}
        {selectedFile && status !== "success" && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={status === "uploading"}
              className="btn-primary"
            >
              {status === "uploading" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Transactions
                </>
              )}
            </button>
          </div>
        )}

        {/* Success */}
        {status === "success" && result && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200/60 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Import successful
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {result.imported} transactions imported ({result.totalTransactions}{" "}
                  total in database)
                </p>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 mt-1">
                    {w}
                  </p>
                ))}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => router.push("/")}
                    className="btn-primary text-xs"
                  >
                    View Dashboard
                  </button>
                  <button onClick={resetUpload} className="btn-secondary text-xs">
                    Import Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && errorMsg && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200/60 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Import failed</p>
                <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                <button
                  onClick={resetUpload}
                  className="btn-secondary text-xs mt-3"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSV Format Help */}
      <div className="card p-6">
        <h3 className="section-title mb-3">Supported CSV Format</h3>
        <p className="text-sm text-slate-500 mb-4">
          The importer auto-detects common bank statement column names. Best case:
        </p>
        <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-600 space-y-1">
          <p>
            <span className="text-blue-600 font-semibold">date</span> (or
            transaction_date, txn_date, posted_date)
          </p>
          <p>
            <span className="text-blue-600 font-semibold">description</span> (or
            merchant, narrative, details)
          </p>
          <p>
            <span className="text-blue-600 font-semibold">amount</span> (or use
            separate debit + credit columns)
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Negative amounts are treated as expenses. Positive amounts are treated as income.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-red-200/60">
        <h3 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-xs text-slate-500 mb-3">
          Clear all imported transactions. This cannot be undone.
        </p>
        <button
          onClick={handleClearData}
          disabled={clearing}
          className="btn-danger text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearing ? "Clearing..." : "Clear All Data"}
        </button>
      </div>
    </div>
  );
}
