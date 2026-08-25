"use client";

import { useState } from "react";
import Link from "next/link";
import { StockOpportunity } from "@/lib/types";
import { API_BASE_URL } from "@/lib/api";
import { Radar, Sparkles, Inbox, RefreshCw, ArrowUpRight, TrendingUp, Target, X, MessageSquareQuote } from "lucide-react";

interface OpportunityRadarProps {
  opportunities: StockOpportunity[];
  onSelectSuggestion?: (symbol: string) => void;
  onRefreshOpportunities?: () => void;
}

export function OpportunityRadar({
  opportunities: initialOpportunities,
  onSelectSuggestion,
  onRefreshOpportunities,
}: OpportunityRadarProps) {
  const [opportunities, setOpportunities] = useState<StockOpportunity[]>(initialOpportunities);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<StockOpportunity | null>(null);

  // Sync state if props change
  if (initialOpportunities !== opportunities && !isScanning && opportunities.length === 0) {
    setOpportunities(initialOpportunities);
  }

  const handleScanOpportunities = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/opportunities/scan`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.opportunities) {
        setOpportunities(data.opportunities);
      }
      if (onRefreshOpportunities) onRefreshOpportunities();
    } catch (e) {
      console.error("Opportunity scan failed:", e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Radar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Stock Opportunity Radar</h3>
            <p className="text-xs text-slate-400">Grounded in surplus cash & technical oversold signals</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/watchlist"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all active:scale-95"
            title="Open Watchlist & 6-Pillar Analysis Workspace"
          >
            <span>Watchlist</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
          <button
            onClick={handleScanOpportunities}
            disabled={isScanning}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Scan market for live dips and oversold signals"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isScanning ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Scan Signals</span>
          </button>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {opportunities.length} Active
          </span>
        </div>
      </div>

      {/* Body */}
      {opportunities.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
          <div className="p-3 rounded-full bg-slate-800/60 text-slate-500">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">No Active Stock Signals Discovered</p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
              Click &quot;Scan Signals&quot; to evaluate technical oversold stocks against your monthly cash surplus.
            </p>
          </div>
          <button
            onClick={handleScanOpportunities}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm"
          >
            Run Opportunity Scanner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {opportunities.map((opp, idx) => {
            const gainPotential =
              opp.target_price && opp.price
                ? Math.round(((opp.target_price - opp.price) / opp.price) * 100)
                : 15;

            return (
              <div
                key={idx}
                onClick={() => setSelectedOpp(opp)}
                className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                          {opp.symbol}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 uppercase">
                          {opp.exchange}
                        </span>
                        {opp.rsi_14 < 35 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            RSI {opp.rsi_14.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 mt-1 font-mono font-semibold">
                        ₹{opp.price.toLocaleString("en-IN")}
                        <span className="text-slate-400 font-normal text-[11px] ml-1">
                          → Target: ₹{opp.target_price?.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3 inline" />
                        +{gainPotential}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {opp.thesis}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-amber-400/90 font-medium">-{opp.pe_discount}% PE Discount</span>
                  <span className="text-blue-400 group-hover:underline flex items-center gap-0.5 font-semibold">
                    View Thesis <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedOpp.symbol} Opportunity Thesis</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedOpp.exchange}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Grounded in Technical Reversal & Cash Surplus</p>
                </div>
              </div>
              <button onClick={() => setSelectedOpp(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-medium">Current Price</span>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  ₹{selectedOpp.price.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-medium">Target Fair Value</span>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  ₹{selectedOpp.target_price?.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-medium">RSI-14 (14D)</span>
                <p className="text-sm font-bold text-blue-400 font-mono mt-0.5">
                  {selectedOpp.rsi_14.toFixed(1)} {selectedOpp.rsi_14 < 35 ? "(Oversold)" : ""}
                </p>
              </div>
            </div>

            {/* Thesis Details */}
            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Investment & Quantitative Thesis
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedOpp.thesis}</p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Link
                href="/watchlist"
                onClick={() => setSelectedOpp(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1"
              >
                <span>6-Pillar Analysis</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (onSelectSuggestion) onSelectSuggestion(selectedOpp.symbol);
                  setSelectedOpp(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <MessageSquareQuote className="w-3.5 h-3.5" />
                <span>Ask Copilot About {selectedOpp.symbol}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
