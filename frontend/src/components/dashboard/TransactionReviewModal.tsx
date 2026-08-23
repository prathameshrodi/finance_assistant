"use client";

import { useState } from "react";
import { Check, X, AlertTriangle, Plus, Tag, ArrowRight, Loader2 } from "lucide-react";

export interface StagedTransactionItem {
  temp_id: string;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  txn_type: "debit" | "credit";
  suggested_category?: string;
  final_category: string;
  is_duplicate: boolean;
  user_action: "accept" | "skip";
}

interface TransactionReviewModalProps {
  isOpen: boolean;
  threadId: string;
  stagedTransactions: StagedTransactionItem[];
  availableCategories: string[];
  onConfirmReview: (threadId: string, reviewed: StagedTransactionItem[]) => Promise<void>;
  onCancel: () => void;
}

export function TransactionReviewModal({
  isOpen,
  threadId,
  stagedTransactions,
  availableCategories,
  onConfirmReview,
  onCancel,
}: TransactionReviewModalProps) {
  const [items, setItems] = useState<StagedTransactionItem[]>(stagedTransactions);
  const [customCategoryInputs, setCustomCategoryInputs] = useState<{ [id: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleAction = (temp_id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.temp_id === temp_id
          ? { ...it, user_action: it.user_action === "accept" ? "skip" : "accept" }
          : it
      )
    );
  };

  const handleCategorySelect = (temp_id: string, selectedCat: string) => {
    if (selectedCat === "__NEW__") {
      setCustomCategoryInputs((prev) => ({ ...prev, [temp_id]: "" }));
    } else {
      setCustomCategoryInputs((prev) => {
        const next = { ...prev };
        delete next[temp_id];
        return next;
      });
      setItems((prev) =>
        prev.map((it) => (it.temp_id === temp_id ? { ...it, final_category: selectedCat } : it))
      );
    }
  };

  const handleCustomCategoryBlur = (temp_id: string) => {
    const val = customCategoryInputs[temp_id]?.trim();
    if (val) {
      setItems((prev) =>
        prev.map((it) => (it.temp_id === temp_id ? { ...it, final_category: val } : it))
      );
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmReview(threadId, items);
    } finally {
      setIsSubmitting(false);
    }
  };

  const approvedCount = items.filter((it) => it.user_action === "accept").length;
  const skippedCount = items.filter((it) => it.user_action === "skip").length;
  const totalDebitSum = items
    .filter((it) => it.user_action === "accept" && it.txn_type === "debit")
    .reduce((sum, it) => sum + it.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Review Extracted Transactions
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {items.length} Extracted
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review categories, create custom categories on the fly, or force-include flagged duplicates.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Transaction List */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-2.5 no-scrollbar">
          {items.map((txn) => {
            const isCustomInput = customCategoryInputs[txn.temp_id] !== undefined;

            return (
              <div
                key={txn.temp_id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                  txn.user_action === "skip"
                    ? "bg-slate-900/40 border-slate-800/50 opacity-60"
                    : txn.is_duplicate
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700/80"
                }`}
              >
                {/* Left: Checkbox & Merchant Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleAction(txn.temp_id)}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                      txn.user_action === "accept"
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {txn.user_action === "accept" ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>{txn.user_action === "accept" ? "Include" : "Skip"}</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {txn.date}
                      </span>
                      <span className="font-bold text-white truncate text-xs">
                        {txn.merchant}
                      </span>
                      {txn.is_duplicate && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3" /> Duplicate in DB
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {txn.description}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Category Dropdown */}
                <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                  {/* Amount Pill */}
                  <div className="text-right min-w-[90px]">
                    <span
                      className={`font-mono font-bold text-sm ${
                        txn.txn_type === "credit" ? "text-emerald-400" : "text-slate-200"
                      }`}
                    >
                      {txn.txn_type === "credit" ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Category Assignment */}
                  <div className="w-44">
                    {isCustomInput ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Type custom category..."
                          value={customCategoryInputs[txn.temp_id]}
                          onChange={(e) =>
                            setCustomCategoryInputs({
                              ...customCategoryInputs,
                              [txn.temp_id]: e.target.value,
                            })
                          }
                          onBlur={() => handleCustomCategoryBlur(txn.temp_id)}
                          className="w-full bg-slate-800 border border-blue-500 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <select
                        value={txn.final_category}
                        onChange={(e) => handleCategorySelect(txn.temp_id, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__NEW__">+ Custom Category...</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Approved: <strong className="text-white">{approvedCount} txns</strong> (₹
            {totalDebitSum.toLocaleString("en-IN")}) ·{" "}
            <span className="text-amber-400">{skippedCount} skipped</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={approvedCount === 0 || isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing to Ledger...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Commit ({approvedCount} Items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
