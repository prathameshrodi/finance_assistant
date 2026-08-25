"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingUp,
  X,
  Target,
  Sparkles,
  BarChart3,
  Activity,
  ShieldAlert,
  PieChart,
  ArrowUpRight,
  MessageSquareQuote,
  Layers,
  Brain,
  Globe,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

interface WatchlistItem {
  id: string;
  symbol: string;
  exchange: string;
  target_buy_price?: number;
  alert_notes?: string;
  current_price: number;
  day_change_pct: number;
  rsi_14: number;
  pe_ratio: number;
  created_at: string;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newExchange, setNewExchange] = useState("NSE");
  const [newTargetPrice, setNewTargetPrice] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deep Analysis Modal
  const [analyzingSymbol, setAnalyzingSymbol] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<any | null>(null);
  const [activePillarTab, setActivePillarTab] = useState<"fundamentals" | "technicals" | "macro" | "catalysts" | "portfolio" | "sentiment">("fundamentals");

  // Global Ticker Search State
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [isGlobalDropdownOpen, setIsGlobalDropdownOpen] = useState(false);
  const [modalSuggestions, setModalSuggestions] = useState<any[]>([]);

  // Debounced Global Search for Search Input
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setGlobalSearchResults([]);
      setIsGlobalDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/stocks/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setGlobalSearchResults(data.results || []);
          setIsGlobalDropdownOpen((data.results || []).length > 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced Search inside Add Modal
  useEffect(() => {
    if (!newSymbol.trim() || newSymbol.trim().length < 2) {
      setModalSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/stocks/search?q=${encodeURIComponent(newSymbol.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setModalSuggestions(data.results || []);
        }
      } catch (e) {
        console.error(e);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [newSymbol]);

  // Direct add global ticker to watchlist
  const handleAddGlobalStock = async (symbol: string, exchange: string, name?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          exchange: exchange || "NSE",
          target_buy_price: null,
          alert_notes: name ? `${name} - Added via Global Search` : "Global Ticker Watch",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: "success", message: `Added ${symbol} (${exchange}) to your Watchlist!` });
        setIsGlobalDropdownOpen(false);
        setSearchQuery("");
        await fetchWatchlist();
      } else {
        setNotification({ type: "error", message: data.detail || "Failed to add stock." });
      }
    } catch (e) {
      setNotification({ type: "error", message: "Error adding stock to watchlist." });
    }
  };

  const fetchWatchlist = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchlist`);
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist || []);
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: "error", message: "Failed to connect to backend." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: newSymbol.trim().toUpperCase(),
          exchange: newExchange,
          target_buy_price: parseFloat(newTargetPrice) || null,
          alert_notes: newNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({ type: "success", message: data.message });
        setIsAddModalOpen(false);
        setNewSymbol("");
        setNewTargetPrice("");
        setNewNotes("");
        await fetchWatchlist();
      } else {
        setNotification({ type: "error", message: data.detail || "Failed to add stock." });
      }
    } catch (e) {
      setNotification({ type: "error", message: "Error adding stock to watchlist." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStock = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/watchlist/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotification({ type: "success", message: "Stock removed from watchlist." });
        setWatchlist(watchlist.filter((item) => item.id !== id));
      }
    } catch (e) {
      setNotification({ type: "error", message: "Failed to delete item." });
    }
  };

  const runDeepAnalysis = async (symbol: string, exchange: string = "NSE") => {
    setAnalyzingSymbol(symbol);
    setAnalysisReport(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/stocks/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, exchange }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisReport(data.report);
      } else {
        alert("Analysis failed for symbol: " + symbol);
        setAnalyzingSymbol(null);
      }
    } catch (e) {
      alert("Error contacting analysis engine.");
      setAnalyzingSymbol(null);
    }
  };

  const filteredWatchlist = watchlist.filter((item) =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.alert_notes && item.alert_notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Stock Watchlist & 6-Pillar Analysis</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {watchlist.length} Tracked Tickers
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Fundamental, Technical, Macro, Governance, and Grounded Portfolio Sizing analysis for Indian equities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchWatchlist}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh Watchlist Quotes"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock to Watchlist</span>
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24 md:pb-8 touch-scroll">
        {/* Search & Global Ticker Discovery Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
          <div className="relative flex-1 w-full max-w-lg">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ANY stock / ticker worldwide (e.g. NVDA, TATAMOTORS, AAPL, RELIANCE, TSLA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {isSearchingGlobal && (
              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
            {searchQuery && !isSearchingGlobal && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsGlobalDropdownOpen(false);
                }}
                className="text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 🌐 Global Ticker Discovery Dropdown */}
            {isGlobalDropdownOpen && globalSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-blue-400" />
                    <span>Global Ticker Results ({globalSearchResults.length})</span>
                  </span>
                  <span className="text-[9px] text-slate-500">Worldwide Exchanges</span>
                </div>

                {globalSearchResults.map((res, idx) => (
                  <div
                    key={`${res.symbol}_${res.exchange}_${idx}`}
                    className="p-2.5 hover:bg-slate-800/70 rounded-xl transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">
                          {res.symbol}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {res.exchange}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                          {res.type || "Equity"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        {res.name}
                      </p>
                      {res.sector && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {res.sector}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setIsGlobalDropdownOpen(false);
                          runDeepAnalysis(res.symbol, res.exchange);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                        title="Run 6-Pillar Deep Stock Analysis"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Analyze</span>
                      </button>

                      <button
                        onClick={() => handleAddGlobalStock(res.symbol, res.exchange, res.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                        title="Add to Watchlist"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 font-medium hidden lg:flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Search Indian (NSE/BSE), US (NASDAQ/NYSE), European or Global Tickers</span>
          </div>
        </div>

        {/* Watchlist Cards Grid */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-semibold text-slate-300">Loading Watchlist Quotes...</p>
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <p className="font-semibold text-slate-300 text-sm">No stocks in your watchlist matching criteria.</p>
            <p className="text-slate-500">Click &quot;Add Stock to Watchlist&quot; to begin tracking tickers.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              Add Your First Stock
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWatchlist.map((item) => {
              const isOversold = item.rsi_14 < 35;
              const isOverbought = item.rsi_14 > 70;

              return (
                <div
                  key={item.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all group"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg text-white group-hover:text-blue-400 transition-colors">
                            {item.symbol}
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                            {item.exchange}
                          </span>
                          {isOversold && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Oversold Dip
                            </span>
                          )}
                        </div>
                        {item.alert_notes && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                            &quot;{item.alert_notes}&quot;
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveStock(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Price & Indicators Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium">Live Price</span>
                        <p className="text-sm font-extrabold text-white font-mono mt-0.5">
                          ₹{item.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-medium">14D RSI</span>
                        <p
                          className={`text-sm font-bold font-mono mt-0.5 ${
                            isOversold
                              ? "text-emerald-400"
                              : isOverbought
                              ? "text-rose-400"
                              : "text-blue-400"
                          }`}
                        >
                          {item.rsi_14.toFixed(1)}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-medium">P/E Ratio</span>
                        <p className="text-sm font-bold text-slate-200 font-mono mt-0.5">
                          {item.pe_ratio.toFixed(1)}x
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    {item.target_buy_price ? (
                      <div className="text-[11px] text-slate-400">
                        Target Buy: <strong className="text-white font-mono">₹{item.target_buy_price}</strong>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">Added on {item.created_at}</span>
                    )}

                    <button
                      onClick={() => runDeepAnalysis(item.symbol, item.exchange)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Deep 6-Pillar Analysis</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: ADD STOCK TO WATCHLIST */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Add Stock to Watchlist</span>
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ticker Symbol or Company Name (Worldwide) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. NVDA, TATAMOTORS, AAPL, RELIANCE, TSLA"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono font-bold focus:outline-none focus:border-blue-500"
                    required
                    autoFocus
                  />
                </div>

                {/* Live Auto-Suggest Chips */}
                {modalSuggestions.length > 0 && (
                  <div className="mt-2 p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-1 max-h-36 overflow-y-auto">
                    <div className="text-[10px] text-slate-400 font-semibold px-1 mb-1">
                      Suggestions:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {modalSuggestions.slice(0, 6).map((s, idx) => (
                        <button
                          key={`${s.symbol}_${idx}`}
                          type="button"
                          onClick={() => {
                            setNewSymbol(s.symbol);
                            setNewExchange(s.exchange || "NSE");
                            if (!newNotes) setNewNotes(s.name ? `${s.name} (${s.sector || "Global"})` : "");
                            setModalSuggestions([]);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-blue-600/30 text-white text-[11px] font-mono border border-slate-600 hover:border-blue-500 flex items-center gap-1 transition-all"
                        >
                          <span className="font-bold">{s.symbol}</span>
                          <span className="text-[9px] text-blue-400">({s.exchange})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Exchange</label>
                  <select
                    value={newExchange}
                    onChange={(e) => setNewExchange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="NSE">NSE (India)</option>
                    <option value="BSE">BSE (India)</option>
                    <option value="NASDAQ">NASDAQ (US)</option>
                    <option value="NYSE">NYSE (US)</option>
                    <option value="LSE">LSE (London)</option>
                    <option value="XETRA">XETRA (Germany)</option>
                    <option value="Tokyo">Tokyo (Japan)</option>
                    <option value="HKEX">HKEX (Hong Kong)</option>
                    <option value="CRYPTO">Crypto Assets</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Entry Price</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 980.00"
                    value={newTargetPrice}
                    onChange={(e) => setNewTargetPrice(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Thesis / Alert Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Looking to accumulate below 50-DMA on EV sector expansion"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save to Watchlist</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 DEEP 6-PILLAR ANALYSIS MODAL */}
      {analyzingSymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl p-6 shadow-2xl flex flex-col space-y-5 overflow-hidden">
            {/* Modal Header */}
            {!analysisReport ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                <div className="text-center">
                  <h3 className="text-base font-bold text-white">Running 6-Pillar Deep Analysis for {analyzingSymbol}...</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluating Fundamentals, Technical DMA/RSI, Macro Beta, Governance Risks, and Grounded Portfolio Sizing.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white">{analysisReport.company_name}</h2>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {analysisReport.symbol} · {analysisReport.exchange}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                          {analysisReport.sector}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Current: <strong className="text-white font-mono">₹{analysisReport.current_price.toLocaleString("en-IN")}</strong> · Fair Target: <strong className="text-emerald-400 font-mono">₹{analysisReport.target_price?.toLocaleString("en-IN")} (+{analysisReport.upside_potential_pct}%)</strong>
                      </p>
                    </div>
                  </div>

                  {/* Conviction Score Badge */}
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-2xl text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Conviction Score</span>
                      <span className="text-base font-black text-emerald-400">
                        {analysisReport.conviction_score} / 10 · {analysisReport.verdict}
                      </span>
                    </div>

                    <button
                      onClick={() => setAnalyzingSymbol(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 6-Pillar Tab Buttons */}
                <div className="flex overflow-x-auto gap-2 bg-slate-800/40 p-1.5 rounded-2xl border border-slate-800 shrink-0 text-xs font-bold">
                  {[
                    { id: "fundamentals", label: "1. Fundamentals & Moat", icon: BarChart3 },
                    { id: "technicals", label: "2. Technicals & Momentum", icon: TrendingUp },
                    { id: "macro", label: "3. Macro Context", icon: Activity },
                    { id: "catalysts", label: "4. Catalysts & Governance", icon: ShieldAlert },
                    { id: "portfolio", label: "5. Grounded Portfolio Sizing", icon: PieChart },
                    { id: "sentiment", label: "6. FII/DII & Consensus", icon: Layers },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActivePillarTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                          activePillarTab === tab.id
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* TAB 1: FUNDAMENTALS */}
                  {activePillarTab === "fundamentals" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">P/E Ratio (Trailing)</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            {analysisReport.pillar_1_fundamentals.pe_ratio}x
                            <span className="text-[10px] text-emerald-400 font-normal ml-1">
                              ({analysisReport.pillar_1_fundamentals.pe_discount_pct}% discount)
                            </span>
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Industry P/E</span>
                          <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
                            {analysisReport.pillar_1_fundamentals.industry_pe}x
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Return on Equity (ROE)</span>
                          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                            {analysisReport.pillar_1_fundamentals.roe_pct}%
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">ROCE</span>
                          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                            {analysisReport.pillar_1_fundamentals.roce_pct}%
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Debt-to-Equity</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            {analysisReport.pillar_1_fundamentals.debt_to_equity} ({analysisReport.pillar_1_fundamentals.health_verdict})
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Operating Margin</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            {analysisReport.pillar_1_fundamentals.operating_margin_pct}%
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Free Cash Flow</span>
                          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                            {analysisReport.pillar_1_fundamentals.free_cash_flow}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Competitive Economic Moat</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{analysisReport.pillar_1_fundamentals.competitive_moat}</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TECHNICALS */}
                  {activePillarTab === "technicals" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Trend Status</span>
                          <p className="text-xs font-bold text-emerald-400 mt-0.5">
                            {analysisReport.pillar_2_technicals.trend}
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">RSI-14</span>
                          <p className="text-sm font-bold text-blue-400 font-mono mt-0.5">
                            {analysisReport.pillar_2_technicals.rsi_14} ({analysisReport.pillar_2_technicals.rsi_status})
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">50-DMA</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            ₹{analysisReport.pillar_2_technicals.dma_50}
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">200-DMA</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            ₹{analysisReport.pillar_2_technicals.dma_200}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Support Level</span>
                          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                            ₹{analysisReport.pillar_2_technicals.support_level}
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Resistance Level</span>
                          <p className="text-sm font-bold text-rose-400 font-mono mt-0.5">
                            ₹{analysisReport.pillar_2_technicals.resistance_level}
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Discount from 52W High</span>
                          <p className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                            -{analysisReport.pillar_2_technicals.discount_from_52w_high}% (High: ₹{analysisReport.pillar_2_technicals.fifty_two_week_high})
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: MACRO CONTEXT */}
                  {activePillarTab === "macro" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Nifty 50 Beta</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            {analysisReport.pillar_3_macro.beta} ({analysisReport.pillar_3_macro.volatility_class})
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Interest Rate Sensitivity</span>
                          <p className="text-xs font-bold text-emerald-400 mt-0.5">
                            {analysisReport.pillar_3_macro.interest_rate_impact}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Macroeconomic & Currency Drivers</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{analysisReport.pillar_3_macro.sensitivities}</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: CATALYSTS & RISKS */}
                  {activePillarTab === "catalysts" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Promoter Holding</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            {analysisReport.pillar_4_catalysts_risks.promoter_holding_pct}%
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Pledged Promoter Shares</span>
                          <p className="text-xs font-bold text-emerald-400 mt-0.5">
                            {analysisReport.pillar_4_catalysts_risks.pledged_risk_level}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Growth Catalysts</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {analysisReport.pillar_4_catalysts_risks.key_catalysts.map((c: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-emerald-400">•</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-2">
                          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Governance & Downside Risks</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {analysisReport.pillar_4_catalysts_risks.key_risks.map((r: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-rose-400">•</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: PORTFOLIO FIT (GROUNDED IN USER SQLITE) */}
                  {activePillarTab === "portfolio" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Already in Portfolio?</span>
                          <p className="text-sm font-bold text-white mt-0.5">
                            {analysisReport.pillar_5_portfolio_fit.already_in_portfolio
                              ? `Yes (${analysisReport.pillar_5_portfolio_fit.units_owned} units)`
                              : "No (New Position)"}
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Current Sector Exposure</span>
                          <p className="text-sm font-bold text-blue-400 font-mono mt-0.5">
                            {analysisReport.pillar_5_portfolio_fit.current_sector_exposure_pct}% of total wealth
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Available Cash Surplus</span>
                          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                            ₹{analysisReport.pillar_5_portfolio_fit.user_cash_surplus.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 space-y-2">
                        <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                          <PieChart className="w-4 h-4 text-blue-400" />
                          <span>Personalized Position Sizing Recommendation</span>
                        </h4>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {analysisReport.pillar_5_portfolio_fit.position_sizing_advice}
                        </p>
                        <div className="pt-2">
                          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-blue-600 text-white shadow-sm inline-block">
                            Recommended Staggered Entry: ₹{analysisReport.pillar_5_portfolio_fit.recommended_allocation_inr.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: SENTIMENT & CONSENSUS */}
                  {activePillarTab === "sentiment" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">FII Ownership</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            {analysisReport.pillar_6_sentiment.fii_holding_pct}%
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">DII Ownership</span>
                          <p className="text-sm font-bold text-white font-mono mt-0.5">
                            {analysisReport.pillar_6_sentiment.dii_holding_pct}%
                          </p>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                          <span className="text-[10px] text-slate-400 font-medium">Total Institutional</span>
                          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                            {analysisReport.pillar_6_sentiment.total_institutional_holding}%
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Dalal Street Analyst Consensus</h4>
                        <div className="w-full bg-slate-800 rounded-full h-3 flex overflow-hidden">
                          <div
                            style={{ width: `${analysisReport.pillar_6_sentiment.consensus_buy_pct}%` }}
                            className="bg-emerald-500 h-full"
                            title={`Buy: ${analysisReport.pillar_6_sentiment.consensus_buy_pct}%`}
                          />
                          <div
                            style={{ width: `${analysisReport.pillar_6_sentiment.consensus_hold_pct}%` }}
                            className="bg-amber-500 h-full"
                            title={`Hold: ${analysisReport.pillar_6_sentiment.consensus_hold_pct}%`}
                          />
                          <div
                            style={{ width: `${analysisReport.pillar_6_sentiment.consensus_sell_pct}%` }}
                            className="bg-rose-500 h-full"
                            title={`Sell: ${analysisReport.pillar_6_sentiment.consensus_sell_pct}%`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-emerald-400">Buy: {analysisReport.pillar_6_sentiment.consensus_buy_pct}%</span>
                          <span className="text-amber-400">Hold: {analysisReport.pillar_6_sentiment.consensus_hold_pct}%</span>
                          <span className="text-rose-400">Sell: {analysisReport.pillar_6_sentiment.consensus_sell_pct}%</span>
                        </div>
                      </div>

                      {/* 📰 LIVE RSS FINANCIAL NEWS FEED */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                            <span>Live Financial RSS News & Media Sentiment</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">Real-time parsed feed</span>
                        </div>

                        {analysisReport.pillar_6_sentiment.rss_news_feed && analysisReport.pillar_6_sentiment.rss_news_feed.length > 0 ? (
                          <div className="space-y-2.5">
                            {analysisReport.pillar_6_sentiment.rss_news_feed.map((article: any, aIdx: number) => (
                              <a
                                key={aIdx}
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group block"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-blue-500/20">
                                      {article.source}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {article.pub_date}
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors leading-snug">
                                    {article.title}
                                  </h5>
                                </div>

                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                      article.sentiment_type === "positive"
                                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                        : article.sentiment_type === "negative"
                                        ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                        : "bg-slate-700/40 text-slate-300 border-slate-600/30"
                                    }`}
                                  >
                                    {article.sentiment}
                                  </span>
                                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/20 rounded-xl border border-slate-800">
                            No recent news headlines found for this ticker.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
                  <button
                    onClick={() => setAnalyzingSymbol(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Close Report
                  </button>

                  <Link
                    href="/"
                    onClick={() => setAnalyzingSymbol(null)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>Ask AI Copilot about {analysisReport.symbol}</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 📱 Mobile Sticky Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
