"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Inbox,
  Search,
  Loader2,
  Building2,
  TrendingUp,
  Landmark,
  Edit2,
  Save,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

interface StagedBankItem {
  temp_id: string;
  staged_id: string;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  txn_type: "debit" | "credit" | "balance" | string;
  suggested_category?: string;
  final_category: string;
  is_duplicate: boolean;
  user_action: "accept" | "skip";
  bank_name: string;
  account_number: string;
  account_type: string;
  created_at?: string;
}

interface StagedHoldingItem {
  staged_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  broker: string;
  account_number: string;
  is_duplicate: boolean;
  user_action: "accept" | "skip";
  created_at?: string;
}

export default function StagedTransactionsPage() {
  const [activeTab, setActiveTab] = useState<"bank" | "demat">("bank");
  const [bankItems, setBankItems] = useState<StagedBankItem[]>([]);
  const [holdingItems, setHoldingItems] = useState<StagedHoldingItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pending" | "duplicates">("all");
  const [customCategoryInputs, setCustomCategoryInputs] = useState<{ [id: string]: string }>({});
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit Mode Tracking
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const loadStagedData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/staged-transactions`);

      if (res && res.ok) {
        const data = await res.json();
        setBankItems(data.staged_transactions || []);
        setHoldingItems(data.staged_holdings || []);
        setCategories(
          data.available_categories || [
            "Food & Dining",
            "Bills & Utilities",
            "Salary & Income",
            "Shopping",
            "Transportation",
            "Investments & Demat",
            "Housing & Rent",
            "Healthcare",
            "Transfers",
            "Other Expenses",
          ]
        );
      }
    } catch (err) {
      console.error("Error fetching staged data:", err);
      setNotification({
        type: "error",
        message: `Failed to connect to backend server on ${API_BASE_URL}. Is python run_backend.py running?`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStagedData();
  }, []);

  // Update Bank Item Field
  const updateBankField = (staged_id: string, field: keyof StagedBankItem, value: any) => {
    setBankItems((prev) =>
      prev.map((it) => (it.staged_id === staged_id ? { ...it, [field]: value } : it))
    );
  };

  // Update Holding Item Field
  const updateHoldingField = (staged_id: string, field: keyof StagedHoldingItem, value: any) => {
    setHoldingItems((prev) =>
      prev.map((h) => (h.staged_id === staged_id ? { ...h, [field]: value } : h))
    );
  };

  // Bank Actions
  const toggleBankAction = (staged_id: string) => {
    setBankItems((prev) =>
      prev.map((it) =>
        it.staged_id === staged_id
          ? { ...it, user_action: it.user_action === "accept" ? "skip" : "accept" }
          : it
      )
    );
  };

  const handleBankCategorySelect = (staged_id: string, selectedCat: string) => {
    if (selectedCat === "__NEW__") {
      setCustomCategoryInputs((prev) => ({ ...prev, [staged_id]: "" }));
    } else {
      setCustomCategoryInputs((prev) => {
        const next = { ...prev };
        delete next[staged_id];
        return next;
      });
      updateBankField(staged_id, "final_category", selectedCat);
    }
  };

  const handleCustomCategoryBlur = (staged_id: string) => {
    const val = customCategoryInputs[staged_id]?.trim();
    if (val) {
      updateBankField(staged_id, "final_category", val);
    }
  };

  // Demat Actions
  const toggleHoldingAction = (staged_id: string) => {
    setHoldingItems((prev) =>
      prev.map((h) =>
        h.staged_id === staged_id
          ? { ...h, user_action: h.user_action === "accept" ? "skip" : "accept" }
          : h
      )
    );
  };

  const handleSelectAll = (action: "accept" | "skip") => {
    if (activeTab === "bank") {
      setBankItems((prev) => prev.map((it) => ({ ...it, user_action: action })));
    } else {
      setHoldingItems((prev) => prev.map((h) => ({ ...h, user_action: action })));
    }
  };

  // Unified Commit
  const handleCommitReview = async () => {
    setIsSubmitting(true);
    setNotification(null);

    try {
      const bodyPayload = JSON.stringify({
        thread_id: `batch_${Date.now()}`,
        reviewed_transactions: bankItems,
        reviewed_holdings: holdingItems,
      });

      const res = await fetch(`${API_BASE_URL}/api/v1/confirm-staged-transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyPayload,
      });

      if (res && res.ok) {
        const result = await res.json();
        setNotification({
          type: "success",
          message: result.message || "Successfully committed all edited records to live ledger!",
        });
        setEditingRowId(null);
        await loadStagedData();
      } else {
        setNotification({
          type: "error",
          message: "Failed to commit records. Please check backend logs.",
        });
      }
    } catch (e) {
      console.error("Error committing staged items:", e);
      setNotification({
        type: "error",
        message: "Failed to connect to backend server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter bank items
  const filteredBankItems = bankItems.filter((it) => {
    const matchesSearch =
      it.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.account_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.final_category.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === "duplicates") return matchesSearch && it.is_duplicate;
    if (filterType === "pending") return matchesSearch && it.user_action === "accept";
    return matchesSearch;
  });

  // Filter holding items
  const filteredHoldings = holdingItems.filter((h) => {
    const matchesSearch =
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.broker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.account_number.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === "duplicates") return matchesSearch && h.is_duplicate;
    if (filterType === "pending") return matchesSearch && h.user_action === "accept";
    return matchesSearch;
  });

  const approvedBankCount = bankItems.filter((it) => it.user_action === "accept").length;
  const approvedHoldingCount = holdingItems.filter((h) => h.user_action === "accept").length;
  const totalApproved = approvedBankCount + approvedHoldingCount;

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Review & Edit AI Parsed Data</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {bankItems.length + holdingItems.length} Pending Total
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                You can directly edit all AI-extracted fields (amounts, bank names, accounts, merchants, categories) before saving
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStagedData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh staged list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            </button>
            <button
              onClick={handleCommitReview}
              disabled={totalApproved === 0 || isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to DB...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Save ({totalApproved} Items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-3 text-xs font-semibold flex items-center justify-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/30"
              : "bg-rose-500/15 text-rose-300 border-b border-rose-500/30"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24 md:pb-8 touch-scroll">
        {/* Segmented Tab Switcher */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => {
              setActiveTab("bank");
              setEditingRowId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "bank"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Bank Account Transactions ({bankItems.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("demat");
              setEditingRowId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "demat"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Demat / Broker Holdings ({holdingItems.length})</span>
          </button>
        </div>

        {/* Controls Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[260px] flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === "bank"
                    ? "Search Bank, A/C Number, Merchant, Category..."
                    : "Search Stock Symbol, Broker, Sector..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterType === "all" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("duplicates")}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterType === "duplicates"
                    ? "bg-amber-500/20 text-amber-300 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Duplicates Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleSelectAll("accept")}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              Include All
            </button>
            <button
              onClick={() => handleSelectAll("skip")}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              Skip All
            </button>
          </div>
        </div>

        {/* TAB 1: BANK TRANSACTIONS TABLE (WITH INLINE EDITING) */}
        {activeTab === "bank" && (
          <>
            {isLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-semibold text-slate-300">Loading Staged Bank Transactions...</p>
              </div>
            ) : filteredBankItems.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 rounded-full bg-slate-800 text-slate-500">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">No Staged Bank Transactions</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  All parsed bank statement records have been approved or none are currently pending.
                </p>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 mt-2"
                >
                  Return to Dashboard
                </Link>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4 w-28">Action</th>
                        <th className="py-3.5 px-4 w-44">Bank & Account</th>
                        <th className="py-3.5 px-4 w-32">Date</th>
                        <th className="py-3.5 px-4">Merchant & Description</th>
                        <th className="py-3.5 px-4 w-36">Category</th>
                        <th className="py-3.5 px-4 text-right w-36">Amount & Type</th>
                        <th className="py-3.5 px-4 text-center w-20">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredBankItems.map((txn) => {
                        const isCustomInput = customCategoryInputs[txn.staged_id] !== undefined;
                        const isEditing = editingRowId === txn.staged_id;

                        return (
                          <tr
                            key={txn.staged_id}
                            className={`transition-colors ${
                              txn.user_action === "skip"
                                ? "bg-slate-950/40 text-slate-500 opacity-60"
                                : isEditing
                                ? "bg-blue-600/10 border-l-2 border-blue-500"
                                : txn.is_duplicate
                                ? "bg-amber-500/5 hover:bg-amber-500/10"
                                : "hover:bg-slate-800/40"
                            }`}
                          >
                            {/* Action Toggle */}
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => toggleBankAction(txn.staged_id)}
                                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs ${
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
                            </td>

                            {/* Bank & Account Info */}
                            <td className="py-3.5 px-4">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={txn.bank_name}
                                    onChange={(e) => updateBankField(txn.staged_id, "bank_name", e.target.value)}
                                    placeholder="Bank Name"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                                  />
                                  <input
                                    type="text"
                                    value={txn.account_number}
                                    onChange={(e) => updateBankField(txn.staged_id, "account_number", e.target.value)}
                                    placeholder="Account Number"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                                  />
                                  <select
                                    value={txn.account_type}
                                    onChange={(e) => updateBankField(txn.staged_id, "account_type", e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-[10px]"
                                  >
                                    <option value="savings">Savings</option>
                                    <option value="current">Current</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="cash">Cash</option>
                                  </select>
                                </div>
                              ) : (
                                <>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    <span className="truncate">{txn.bank_name}</span>
                                  </div>
                                  <p className="text-slate-400 font-mono text-[10px] mt-0.5">
                                    A/C: {txn.account_number}
                                  </p>
                                  <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase mt-0.5">
                                    {txn.account_type}
                                  </span>
                                </>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={txn.date}
                                  onChange={(e) => updateBankField(txn.staged_id, "date", e.target.value)}
                                  placeholder="YYYY-MM-DD"
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                                />
                              ) : (
                                txn.date
                              )}
                            </td>

                            {/* Merchant & Narration */}
                            <td className="py-3.5 px-4">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={txn.merchant}
                                    onChange={(e) => updateBankField(txn.staged_id, "merchant", e.target.value)}
                                    placeholder="Merchant / Counterparty"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold"
                                  />
                                  <input
                                    type="text"
                                    value={txn.description}
                                    onChange={(e) => updateBankField(txn.staged_id, "description", e.target.value)}
                                    placeholder="Transaction Description"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-[11px]"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="font-bold text-white text-sm">{txn.merchant}</div>
                                  <p className="text-slate-400 text-[11px] truncate max-w-sm mt-0.5">
                                    {txn.description}
                                  </p>
                                  {txn.is_duplicate && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold inline-flex items-center gap-1 mt-1">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Duplicate
                                    </span>
                                  )}
                                </>
                              )}
                            </td>

                            {/* Category Dropdown */}
                            <td className="py-3.5 px-4">
                              {isCustomInput ? (
                                <input
                                  type="text"
                                  placeholder="Type custom category..."
                                  value={customCategoryInputs[txn.staged_id]}
                                  onChange={(e) =>
                                    setCustomCategoryInputs({
                                      ...customCategoryInputs,
                                      [txn.staged_id]: e.target.value,
                                    })
                                  }
                                  onBlur={() => handleCustomCategoryBlur(txn.staged_id)}
                                  className="w-full bg-slate-800 border border-blue-500 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <select
                                  value={txn.final_category}
                                  onChange={(e) => handleBankCategorySelect(txn.staged_id, e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                  {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                      {cat}
                                    </option>
                                  ))}
                                  <option value="__NEW__">+ Custom Category...</option>
                                </select>
                              )}
                            </td>

                            {/* Amount & Txn Type */}
                            <td className="py-3.5 px-4 text-right">
                              {isEditing ? (
                                <div className="space-y-1.5 flex flex-col items-end">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={txn.amount}
                                    onChange={(e) => updateBankField(txn.staged_id, "amount", parseFloat(e.target.value) || 0)}
                                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-white text-xs font-mono font-bold"
                                  />
                                  <select
                                    value={txn.txn_type}
                                    onChange={(e) => updateBankField(txn.staged_id, "txn_type", e.target.value as any)}
                                    className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-right text-slate-300 text-[10px]"
                                  >
                                    <option value="debit">Debit (Expense -)</option>
                                    <option value="credit">Credit (Income +)</option>
                                    <option value="balance">Balance Snapshot</option>
                                  </select>
                                </div>
                              ) : (
                                <span
                                  className={`font-mono font-bold text-sm ${
                                    txn.txn_type === "balance"
                                      ? "text-blue-400"
                                      : txn.txn_type === "credit"
                                      ? "text-emerald-400"
                                      : "text-white"
                                  }`}
                                >
                                  {txn.txn_type === "balance"
                                    ? "₹" + txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) + " (Bal)"
                                    : (txn.txn_type === "credit" ? "+" : "-") + "₹" + txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>

                            {/* Inline Edit Button */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setEditingRowId(isEditing ? null : txn.staged_id)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isEditing
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700"
                                }`}
                                title={isEditing ? "Save field edits" : "Edit fields"}
                              >
                                {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: DEMAT / BROKER HOLDINGS TABLE (WITH INLINE EDITING) */}
        {activeTab === "demat" && (
          <>
            {isLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-semibold text-slate-300">Loading Staged Demat Holdings...</p>
              </div>
            ) : filteredHoldings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-4 rounded-full bg-slate-800 text-slate-500">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">No Staged Broker Holdings</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Upload a Zerodha, Groww, or broker statement to stage equity & mutual fund holdings.
                </p>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 mt-2"
                >
                  Return to Dashboard
                </Link>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4 w-28">Action</th>
                        <th className="py-3.5 px-4 w-44">Broker & Demat A/C</th>
                        <th className="py-3.5 px-4 w-32">Symbol</th>
                        <th className="py-3.5 px-4 w-36">Asset & Sector</th>
                        <th className="py-3.5 px-4 text-right w-24">Quantity</th>
                        <th className="py-3.5 px-4 text-right w-28">Avg Buy Price</th>
                        <th className="py-3.5 px-4 text-right w-32">Total Value</th>
                        <th className="py-3.5 px-4 text-center w-20">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredHoldings.map((h) => {
                        const isEditing = editingRowId === h.staged_id;
                        const totalVal = h.quantity * (h.current_price || h.avg_buy_price);

                        return (
                          <tr
                            key={h.staged_id}
                            className={`transition-colors ${
                              h.user_action === "skip"
                                ? "bg-slate-950/40 text-slate-500 opacity-60"
                                : isEditing
                                ? "bg-blue-600/10 border-l-2 border-blue-500"
                                : "hover:bg-slate-800/40"
                            }`}
                          >
                            {/* Action Toggle */}
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => toggleHoldingAction(h.staged_id)}
                                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs ${
                                  h.user_action === "accept"
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-400"
                                }`}
                              >
                                {h.user_action === "accept" ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                                <span>{h.user_action === "accept" ? "Include" : "Skip"}</span>
                              </button>
                            </td>

                            {/* Broker & Demat A/C */}
                            <td className="py-3.5 px-4">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={h.broker}
                                    onChange={(e) => updateHoldingField(h.staged_id, "broker", e.target.value)}
                                    placeholder="Broker Name"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                                  />
                                  <input
                                    type="text"
                                    value={h.account_number}
                                    onChange={(e) => updateHoldingField(h.staged_id, "account_number", e.target.value)}
                                    placeholder="Demat Account No"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>{h.broker}</span>
                                  </div>
                                  <p className="text-slate-400 font-mono text-[10px] mt-0.5">
                                    Demat: {h.account_number}
                                  </p>
                                </>
                              )}
                            </td>

                            {/* Symbol & Exchange */}
                            <td className="py-3.5 px-4">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={h.symbol}
                                    onChange={(e) => updateHoldingField(h.staged_id, "symbol", e.target.value.toUpperCase())}
                                    placeholder="Symbol"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono font-bold uppercase"
                                  />
                                  <select
                                    value={h.exchange}
                                    onChange={(e) => updateHoldingField(h.staged_id, "exchange", e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-300 text-[10px]"
                                  >
                                    <option value="NSE">NSE</option>
                                    <option value="BSE">BSE</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="font-mono font-bold text-white text-sm">
                                  {h.symbol}
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">({h.exchange})</span>
                                </div>
                              )}
                            </td>

                            {/* Asset Class & Sector */}
                            <td className="py-3.5 px-4">
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <select
                                    value={h.asset_class}
                                    onChange={(e) => updateHoldingField(h.staged_id, "asset_class", e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-xs"
                                  >
                                    <option value="equity">Equity</option>
                                    <option value="mutual_fund">Mutual Fund</option>
                                    <option value="etf">ETF</option>
                                    <option value="debt">Debt / Bond</option>
                                    <option value="gold">Gold</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={h.sector}
                                    onChange={(e) => updateHoldingField(h.staged_id, "sector", e.target.value)}
                                    placeholder="Sector (e.g. Technology)"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-xs"
                                  />
                                </div>
                              ) : (
                                <>
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] uppercase font-semibold">
                                    {h.asset_class}
                                  </span>
                                  <p className="text-slate-400 text-[11px] mt-1">{h.sector}</p>
                                </>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className="py-3.5 px-4 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="any"
                                  value={h.quantity}
                                  onChange={(e) => updateHoldingField(h.staged_id, "quantity", parseFloat(e.target.value) || 0)}
                                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-white text-xs font-mono font-bold"
                                />
                              ) : (
                                <span className="font-mono font-semibold text-white">{h.quantity}</span>
                              )}
                            </td>

                            {/* Avg Buy Price */}
                            <td className="py-3.5 px-4 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={h.avg_buy_price}
                                  onChange={(e) => updateHoldingField(h.staged_id, "avg_buy_price", parseFloat(e.target.value) || 0)}
                                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-white text-xs font-mono"
                                />
                              ) : (
                                <span className="font-mono text-slate-300">
                                  ₹{h.avg_buy_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>

                            {/* Total Value */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                              ₹{totalVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Inline Edit Button */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setEditingRowId(isEditing ? null : h.staged_id)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isEditing
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700"
                                }`}
                                title={isEditing ? "Save field edits" : "Edit fields"}
                              >
                                {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 📱 Mobile Sticky Bottom Navigation */}
      <MobileBottomNav pendingCount={bankItems.length + holdingItems.length} />
    </div>
  );
}
