"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Zap } from "lucide-react";

interface StatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPipeline?: (file: File, statementType: string, skipStaging?: boolean) => void;
}

export function StatementUploadModal({
  isOpen,
  onClose,
  onStartPipeline,
}: StatementUploadModalProps) {
  const [statementType, setStatementType] = useState<"bank_statement" | "demat_statement">("bank_statement");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [skipStaging, setSkipStaging] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (onStartPipeline) {
      onStartPipeline(selectedFile, statementType, skipStaging);
    }
    onClose();
    setSelectedFile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Upload Financial Statement</h3>
              <p className="text-[11px] text-slate-400">Processes via LangGraph State Machine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Statement Type</label>
            <select
              value={statementType}
              onChange={(e) => setStatementType(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="bank_statement">Bank Account Statement / Excel Ledger (PDF, XLSX, CSV)</option>
              <option value="demat_statement">Demat / Broker Statement (PDF, CSV)</option>
            </select>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-3 rounded-full bg-slate-800 group-hover:bg-blue-600/20 group-hover:text-blue-400 text-slate-400 mb-2 transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            {selectedFile ? (
              <div>
                <p className="text-xs font-semibold text-white truncate max-w-[280px]">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Ready to ingest
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Click to select statement or ledger file
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supports PDF, Excel (.xlsx, .xls) or CSV files
                </p>
              </div>
            )}
          </div>

          {/* ⚡ Skip Staging Toggle */}
          <div
            onClick={() => setSkipStaging(!skipStaging)}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              skipStaging
                ? "bg-emerald-500/10 border-emerald-500/30 text-slate-200"
                : "bg-slate-800/40 border-slate-800 text-slate-400"
            }`}
          >
            <input
              type="checkbox"
              checked={skipStaging}
              onChange={(e) => setSkipStaging(e.target.checked)}
              className="mt-0.5 rounded accent-emerald-500"
            />
            <div className="text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Skip Staging Area (Direct Ledger Commit)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Automatically deduplicates with SHA-256 and writes straight to your live ledger without holding records for review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{skipStaging ? "Direct Ingestion" : "Stage for Review"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
