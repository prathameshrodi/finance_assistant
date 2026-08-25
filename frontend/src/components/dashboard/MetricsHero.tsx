"use client";

import { HeroMetrics } from "@/lib/types";
import { TrendingUp, Wallet, ArrowUpRight, Flame, Clock } from "lucide-react";

interface MetricsHeroProps {
  metrics: HeroMetrics;
  currency?: string;
}

export function MetricsHero({ metrics, currency = "INR" }: MetricsHeroProps) {
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {/* 1. Net Worth */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Worth</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {sym}{metrics.net_worth.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{metrics.net_worth_change_pct}% Today</span>
          </div>
        </div>
      </div>

      {/* 2. Liquid Cash */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Liquid Cash</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            ₹{metrics.liquid_cash.toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-slate-400">Available across savings & cash</span>
        </div>
      </div>

      {/* 3. Salary Consumed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Salary Burn</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {metrics.salary_consumed_pct}%
          </div>
          <span className="text-xs text-slate-400">
            ₹{metrics.total_spent_this_month.toLocaleString("en-IN")} spent so far
          </span>
        </div>
      </div>

      {/* 4. Portfolio Returns (XIRR) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Annual Return (XIRR)</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
            +{metrics.portfolio_xirr}% p.a.
          </div>
          <span className="text-xs text-slate-400">Beating NIFTY by +3.6%</span>
        </div>
      </div>
    </div>
  );
}
