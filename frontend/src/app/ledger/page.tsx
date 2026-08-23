"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Landmark,
  TrendingUp,
  X,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Zap,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface TransactionRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  txn_type: "debit" | "credit";
  category_id: string;
  category_name: string;
  account_id: string;
  account_name: string;
  created_at: string;
}

interface HoldingRecord {
  id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  sector: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  current_value: number;
  cost_basis: number;
  pnl_amount: number;
  pnl_pct: number;
  account_id: string;
  account_name: string;
  last_synced_at: string;
}

interface MetaAccount {
  id: string;
  name: string;
  account_type: string;
  account_number_masked?: string;
  balance?: number;
}

interface MetaCategory {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

export default function LedgerCrudPage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "holdings">("transactions");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [holdings, setHoldings] = useState<HoldingRecord[]>([]);
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [categories, setCategories] = useState<MetaCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterCategory, setSelectedFilterCategory] = useState("all");
  const [selectedFilterType, setSelectedFilterType] = useState<"all" | "debit" | "credit">("all");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFilterCategory, selectedFilterType, activeTab]);

  // Modals
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<TransactionRecord | null>(null);
  const [txnForm, setTxnForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    txn_type: "debit" as "debit" | "credit",
    category_id: "",
    account_id: "",
  });

  const [isHoldingModalOpen, setIsHoldingModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<HoldingRecord | null>(null);
  const [holdingForm, setHoldingForm] = useState({
    symbol: "",
    exchange: "NSE",
    asset_class: "equity",
    sector: "General",
    quantity: "",
    avg_buy_price: "",
    current_price: "",
    account_id: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const fetchLedgerData = async () => {
    setIsLoading(true);
    try {
      const [metaRes, txnsRes, holdingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/ledger/meta`),
        fetch(`${API_BASE_URL}/api/v1/ledger/transactions`),
        fetch(`${API_BASE_URL}/api/v1/ledger/holdings`),
      ]);

      if (metaRes && metaRes.ok) {
        const meta = await metaRes.json();
        setAccounts(meta.accounts || []);
        setCategories(meta.categories || []);
      }
      if (txnsRes && txnsRes.ok) {
        const txns = await txnsRes.json();
        setTransactions(txns.transactions || []);
      }
      if (holdingsRes && holdingsRes.ok) {
        const h = await holdingsRes.json();
        setHoldings(h.holdings || []);
      }
    } catch (err) {
      console.error("Failed to load ledger data:", err);
      setNotification({
        type: "error",
        message: "Failed to connect to backend. Is python run_backend.py running?",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, []);

  // -------------------------------------------------------------
  // TRANSACTION CRUD HANDLERS
  // -------------------------------------------------------------
  const openNewTxnModal = () => {
    setEditingTxn(null);
    setTxnForm({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      txn_type: "debit",
      category_id: categories[0]?.id || "",
      account_id: accounts[0]?.id || "",
    });
    setIsTxnModalOpen(true);
  };

  const openEditTxnModal = (t: TransactionRecord) => {
    setEditingTxn(t);
    setTxnForm({
      date: t.date,
      description: t.description,
      amount: t.amount.toString(),
      txn_type: t.txn_type,
      category_id: t.category_id,
      account_id: t.account_id,
    });
    setIsTxnModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnForm.description || !txnForm.amount || !txnForm.account_id || !txnForm.category_id) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        account_id: txnForm.account_id,
        category_id: txnForm.category_id,
        amount: parseFloat(txnForm.amount) || 0,
        transaction_date: txnForm.date,
        description: txnForm.description,
        txn_type: txnForm.txn_type,
      };

      const url = editingTxn
        ? `${API_BASE_URL}/api/v1/ledger/transactions/${editingTxn.id}`
        : `${API_BASE_URL}/api/v1/ledger/transactions`;
      const method = editingTxn ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: editingTxn ? "Transaction updated successfully." : "Transaction created successfully.",
        });
        setIsTxnModalOpen(false);
        await fetchLedgerData();
      } else {
        alert("Failed to save transaction.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ledger/transactions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotification({ type: "success", message: "Transaction deleted." });
        await fetchLedgerData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // HOLDING CRUD HANDLERS
  // -------------------------------------------------------------
  const openNewHoldingModal = () => {
    setEditingHolding(null);
    setHoldingForm({
      symbol: "",
      exchange: "NSE",
      asset_class: "equity",
      sector: "General",
      quantity: "",
      avg_buy_price: "",
      current_price: "",
      account_id: accounts.find((a) => a.account_type === "demat")?.id || accounts[0]?.id || "",
    });
    setIsHoldingModalOpen(true);
  };

  const openEditHoldingModal = (h: HoldingRecord) => {
    setEditingHolding(h);
    setHoldingForm({
      symbol: h.symbol,
      exchange: h.exchange,
      asset_class: h.asset_class,
      sector: h.sector,
      quantity: h.quantity.toString(),
      avg_buy_price: h.avg_buy_price.toString(),
      current_price: h.current_price.toString(),
      account_id: h.account_id,
    });
    setIsHoldingModalOpen(true);
  };

  const handleSaveHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdingForm.symbol || !holdingForm.quantity || !holdingForm.avg_buy_price || !holdingForm.account_id) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        account_id: holdingForm.account_id,
        symbol: holdingForm.symbol.toUpperCase().trim(),
        exchange: holdingForm.exchange,
        asset_class: holdingForm.asset_class,
        sector: holdingForm.sector,
        quantity: parseFloat(holdingForm.quantity) || 0,
        avg_buy_price: parseFloat(holdingForm.avg_buy_price) || 0,
        current_price: parseFloat(holdingForm.current_price) || parseFloat(holdingForm.avg_buy_price) || 0,
      };

      const url = editingHolding
        ? `${API_BASE_URL}/api/v1/ledger/holdings/${editingHolding.id}`
        : `${API_BASE_URL}/api/v1/ledger/holdings`;
      const method = editingHolding ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: editingHolding ? "Holding updated successfully." : "Holding created successfully.",
        });
        setIsHoldingModalOpen(false);
        await fetchLedgerData();
      } else {
        alert("Failed to save holding.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving holding.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio holding?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ledger/holdings/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotification({ type: "success", message: "Holding deleted." });
        await fetchLedgerData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -------------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------------
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.date.includes(searchQuery);

    const matchesCat = selectedFilterCategory === "all" || t.category_id === selectedFilterCategory;
    const matchesType = selectedFilterType === "all" || t.txn_type === selectedFilterType;

    return matchesSearch && matchesCat && matchesType;
  });

  const filteredHoldings = holdings.filter((h) => {
    return (
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.asset_class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.account_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // KPI Calculations
  const totalInflow = transactions.filter((t) => t.txn_type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions.filter((t) => t.txn_type === "debit").reduce((s, t) => s + t.amount, 0);

  const totalPortfolioValue = holdings.reduce((s, h) => s + h.current_value, 0);
  const totalCostBasis = holdings.reduce((s, h) => s + h.cost_basis, 0);
  const totalPnl = totalPortfolioValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col">
      {/* 1. Header */}
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
            <Link
              href="/analytics"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Analytics</span>
            </Link>
            <Link
              href="/watchlist"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Watchlist</span>
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Financial Ledger & Holdings Manager</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {transactions.length} Txns · {holdings.length} Holdings
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                View, create, edit, or delete live transaction records and portfolio holdings directly in SQLite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "holdings" && (
              <button
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const res = await fetch(`${API_BASE_URL}/api/v1/market/sync`, { method: "POST" });
                    const d = await res.json();
                    setNotification({ type: "success", message: d.message || "Market quotes updated!" });
                    await fetchLedgerData();
                  } catch (e) {
                    setNotification({ type: "error", message: "Failed to sync market quotes." });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Fetch latest stock & mutual fund market quotes"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Sync Live Quotes</span>
              </button>
            )}

            <button
              onClick={fetchLedgerData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            </button>
            <button
              onClick={activeTab === "transactions" ? openNewTxnModal : openNewHoldingModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === "transactions" ? "Add Transaction" : "Add Holding"}</span>
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* KPI Cards */}
        {activeTab === "transactions" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Total Inflows (Credits)</span>
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-xl font-extrabold text-emerald-400 mt-1">
                +₹{totalInflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Salary, dividends & incoming transfers</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Total Outflows (Debits)</span>
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
              <h3 className="text-xl font-extrabold text-rose-400 mt-1">
                -₹{totalOutflow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Spends across all linked bank accounts</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Net Ledger Cashflow</span>
                <Landmark className="w-4 h-4 text-blue-400" />
              </div>
              <h3
                className={`text-xl font-extrabold mt-1 ${
                  totalInflow - totalOutflow >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {totalInflow - totalOutflow >= 0 ? "+" : "-"}₹
                {Math.abs(totalInflow - totalOutflow).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Recorded across {transactions.length} entries</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Total Portfolio Valuation</span>
              <h3 className="text-xl font-extrabold text-white mt-1">
                ₹{totalPortfolioValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Current market value of assets</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Invested Capital (Cost Basis)</span>
              <h3 className="text-xl font-extrabold text-slate-300 mt-1">
                ₹{totalCostBasis.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Total purchase price</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400 font-medium">Unrealized P&L</span>
              <h3 className={`text-xl font-extrabold mt-1 ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalPnl >= 0 ? "+" : "-"}₹{Math.abs(totalPnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                <span className="text-xs ml-1.5 font-bold">({totalPnlPct > 0 ? "+" : ""}{totalPnlPct}%)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Returns across {holdings.length} assets</p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "transactions"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Transactions Ledger ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("holdings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "holdings"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Portfolio Holdings ({holdings.length})</span>
          </button>
        </div>

        {/* Controls Bar: Search & Filter */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[260px] flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === "transactions"
                    ? "Search description, merchant, category, account..."
                    : "Search symbol, sector, asset class, account..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {activeTab === "transactions" && (
              <>
                <select
                  value={selectedFilterCategory}
                  onChange={(e) => setSelectedFilterCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedFilterType}
                  onChange={(e) => setSelectedFilterType(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="debit">Debits (-)</option>
                  <option value="credit">Credits (+)</option>
                  <option value="balance">Balance Snapshots</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* TAB 1: TRANSACTIONS TABLE */}
        {activeTab === "transactions" && (() => {
          const totalFilteredTxns = filteredTransactions.length;
          const totalPages = Math.max(1, Math.ceil(totalFilteredTxns / pageSize));
          const safePage = Math.min(Math.max(1, currentPage), totalPages);
          const startIndex = (safePage - 1) * pageSize;
          const endIndex = Math.min(startIndex + pageSize, totalFilteredTxns);
          const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

          return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-semibold text-slate-300">Loading Transactions...</p>
                </div>
              ) : totalFilteredTxns === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No transactions found matching criteria. Click &quot;Add Transaction&quot; to insert one.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3.5 px-4 w-28">Date</th>
                          <th className="py-3.5 px-4">Description</th>
                          <th className="py-3.5 px-4 w-40">Category</th>
                          <th className="py-3.5 px-4 w-44">Account</th>
                          <th className="py-3.5 px-4 text-right w-36">Amount</th>
                          <th className="py-3.5 px-4 text-center w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {paginatedTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-slate-300">{t.date}</td>
                            <td className="py-3.5 px-4 font-bold text-white text-sm">{t.description}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs">
                                {t.category_name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5 mt-3.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{t.account_name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                              <span
                                className={
                                  t.txn_type === "balance"
                                    ? "text-blue-400"
                                    : t.txn_type === "credit"
                                    ? "text-emerald-400"
                                    : "text-white"
                                }
                              >
                                {t.txn_type === "balance"
                                  ? "₹" + t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) + " (Bal)"
                                  : (t.txn_type === "credit" ? "+" : "-") +
                                    "₹" +
                                    t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openEditTxnModal(t)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                  title="Edit transaction"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                  title="Delete transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 📄 TRANSACTIONS PAGINATION BAR */}
                  <div className="bg-slate-800/60 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>
                        Showing <strong className="text-white font-mono">{startIndex + 1}</strong> to{" "}
                        <strong className="text-white font-mono">{endIndex}</strong> of{" "}
                        <strong className="text-blue-400 font-mono">{totalFilteredTxns.toLocaleString("en-IN")}</strong> transactions
                      </span>

                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[11px] text-slate-500">Rows:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={250}>250</option>
                          <option value={500}>500</option>
                        </select>
                      </div>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={safePage === 1}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(safePage - 1)}
                          disabled={safePage === 1}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1 font-mono text-xs font-semibold text-slate-200">
                          Page <strong className="text-white">{safePage}</strong> of <strong className="text-white">{totalPages}</strong>
                        </span>

                        <button
                          onClick={() => setCurrentPage(safePage + 1)}
                          disabled={safePage === totalPages}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={safePage === totalPages}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* TAB 2: HOLDINGS TABLE */}
        {activeTab === "holdings" && (() => {
          const totalFilteredHoldings = filteredHoldings.length;
          const totalHoldingPages = Math.max(1, Math.ceil(totalFilteredHoldings / pageSize));
          const safeHoldingPage = Math.min(Math.max(1, currentPage), totalHoldingPages);
          const startHoldingIndex = (safeHoldingPage - 1) * pageSize;
          const endHoldingIndex = Math.min(startHoldingIndex + pageSize, totalFilteredHoldings);
          const paginatedHoldings = filteredHoldings.slice(startHoldingIndex, endHoldingIndex);

          return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-semibold text-slate-300">Loading Portfolio Holdings...</p>
                </div>
              ) : totalFilteredHoldings === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No portfolio holdings found. Click &quot;Add Holding&quot; to insert one.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3.5 px-4 w-32">Symbol</th>
                          <th className="py-3.5 px-4 w-36">Asset & Sector</th>
                          <th className="py-3.5 px-4 w-44">Demat Account</th>
                          <th className="py-3.5 px-4 text-right w-24">Quantity</th>
                          <th className="py-3.5 px-4 text-right w-28">Avg Buy</th>
                          <th className="py-3.5 px-4 text-right w-28">Current Price</th>
                          <th className="py-3.5 px-4 text-right w-32">Total Value</th>
                          <th className="py-3.5 px-4 text-right w-28">P&L</th>
                          <th className="py-3.5 px-4 text-center w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {paginatedHoldings.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                              {h.symbol}
                              <span className="text-[10px] text-slate-400 font-normal ml-1">({h.exchange})</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] uppercase font-semibold">
                                {h.asset_class}
                              </span>
                              <p className="text-slate-400 text-[11px] mt-1">{h.sector}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 truncate">{h.account_name}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">{h.quantity}</td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                              ₹{h.avg_buy_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                              ₹{h.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                              ₹{h.current_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td
                              className={`py-3.5 px-4 text-right font-mono font-bold ${
                                h.pnl_amount >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {h.pnl_amount >= 0 ? "+" : "-"}₹{Math.abs(h.pnl_amount).toLocaleString("en-IN")}
                              <span className="text-[10px] block font-normal">
                                ({h.pnl_pct > 0 ? "+" : ""}{h.pnl_pct}%)
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openEditHoldingModal(h)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                  title="Edit holding"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteHolding(h.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                  title="Delete holding"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 📄 HOLDINGS PAGINATION BAR */}
                  {totalFilteredHoldings > pageSize && (
                    <div className="bg-slate-800/60 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span>
                          Showing <strong className="text-white font-mono">{startHoldingIndex + 1}</strong> to{" "}
                          <strong className="text-white font-mono">{endHoldingIndex}</strong> of{" "}
                          <strong className="text-blue-400 font-mono">{totalFilteredHoldings}</strong> holdings
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={safeHoldingPage === 1}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(safeHoldingPage - 1)}
                          disabled={safeHoldingPage === 1}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1 font-mono text-xs font-semibold text-slate-200">
                          Page <strong className="text-white">{safeHoldingPage}</strong> of <strong className="text-white">{totalHoldingPages}</strong>
                        </span>

                        <button
                          onClick={() => setCurrentPage(safeHoldingPage + 1)}
                          disabled={safeHoldingPage === totalHoldingPages}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalHoldingPages)}
                          disabled={safeHoldingPage === totalHoldingPages}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </main>

      {/* MODAL: ADD / EDIT TRANSACTION */}
      {isTxnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingTxn ? "Edit Transaction Record" : "Add New Transaction"}
              </h2>
              <button onClick={() => setIsTxnModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={txnForm.date}
                  onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description / Merchant</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy, Salary, Uber"
                  value={txnForm.description}
                  onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={txnForm.amount}
                    onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <select
                    value={txnForm.txn_type}
                    onChange={(e) => setTxnForm({ ...txnForm, txn_type: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="debit">Debit (Expense -)</option>
                    <option value="credit">Credit (Income +)</option>
                    <option value="balance">Balance Snapshot (Account Balance)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={txnForm.category_id}
                    onChange={(e) => setTxnForm({ ...txnForm, category_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bank Account</label>
                  <select
                    value={txnForm.account_id}
                    onChange={(e) => setTxnForm({ ...txnForm, account_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTxnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTxn ? "Save Changes" : "Create Transaction"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT HOLDING */}
      {isHoldingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingHolding ? "Edit Portfolio Holding" : "Add New Holding"}
              </h2>
              <button onClick={() => setIsHoldingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHolding} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Symbol (Ticker)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INFY, RELIANCE"
                    value={holdingForm.symbol}
                    onChange={(e) => setHoldingForm({ ...holdingForm, symbol: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Exchange</label>
                  <select
                    value={holdingForm.exchange}
                    onChange={(e) => setHoldingForm({ ...holdingForm, exchange: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Asset Class</label>
                  <select
                    value={holdingForm.asset_class}
                    onChange={(e) => setHoldingForm({ ...holdingForm, asset_class: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="equity">Equity (Stock)</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="etf">ETF</option>
                    <option value="debt">Debt / Bond</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Sector</label>
                  <input
                    type="text"
                    placeholder="Technology, Banking"
                    value={holdingForm.sector}
                    onChange={(e) => setHoldingForm({ ...holdingForm, sector: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="10"
                    value={holdingForm.quantity}
                    onChange={(e) => setHoldingForm({ ...holdingForm, quantity: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Avg Buy Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1500.00"
                    value={holdingForm.avg_buy_price}
                    onChange={(e) => setHoldingForm({ ...holdingForm, avg_buy_price: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Current Market Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Leave empty for avg"
                    value={holdingForm.current_price}
                    onChange={(e) => setHoldingForm({ ...holdingForm, current_price: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Demat Account</label>
                  <select
                    value={holdingForm.account_id}
                    onChange={(e) => setHoldingForm({ ...holdingForm, account_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHoldingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingHolding ? "Save Changes" : "Create Holding"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
