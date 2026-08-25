"use client";

import { useState } from "react";
import { SpendVelocityPoint, SpendVelocityMeta } from "@/lib/types";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

interface SpendVelocityChartProps {
  data: SpendVelocityPoint[];
  monthlySalary: number;
  meta?: SpendVelocityMeta;
}

export function SpendVelocityChart({
  data,
  monthlySalary,
  meta,
}: SpendVelocityChartProps) {
  const [viewMode, setViewMode] = useState<"cumulative" | "daily">("cumulative");

  const totalIncome = meta?.total_income ?? monthlySalary;
  const totalSpent = meta?.total_spent ?? 0;
  const netSurplus = meta?.net_surplus ?? (totalIncome - totalSpent);
  const savingsRate = meta?.savings_rate_pct ?? (totalIncome > 0 ? ((netSurplus / totalIncome) * 100) : 0);

  // Normalize data for chart display
  const chartData = data.map((d) => {
    const inc = d.income ?? (d.projected ?? 0);
    const sp = d.spend ?? (d.actual ?? 0);
    const cumInc = d.cumulative_income ?? (d.projected ?? 0);
    const cumSp = d.cumulative_spend ?? (d.actual ?? 0);

    return {
      day: d.day,
      date: d.date,
      displayDay: `Day ${d.day}`,
      // Daily
      dailyIncome: inc,
      dailySpend: sp,
      dailyNet: inc - sp,
      // Cumulative
      cumulativeIncome: cumInc,
      cumulativeSpend: cumSp,
      cumulativeNet: cumInc - cumSp,
    };
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Income vs Spend Flow</h3>
            {meta?.period_label && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {meta.period_label}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Credits vs Debits
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real cash inflows vs outflows aggregated across all linked bank accounts
          </p>
        </div>

        {/* View Toggle & Action Badges */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode("cumulative")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                viewMode === "cumulative"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Cumulative
            </button>
            <button
              onClick={() => setViewMode("daily")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                viewMode === "daily"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Daily Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Total Income (Credits)</span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-400 font-mono">
              +₹{totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Total Spends (Debits)</span>
            <span className="text-xs sm:text-sm font-extrabold text-rose-400 font-mono">
              -₹{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Net Surplus ({savingsRate.toFixed(0)}%)</span>
            <span
              className={`text-xs sm:text-sm font-extrabold font-mono ${
                netSurplus >= 0 ? "text-blue-400" : "text-amber-400"
              }`}
            >
              {netSurplus >= 0 ? "+" : "-"}₹{Math.abs(netSurplus).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "cumulative" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `Day ${v}`}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value: any, name: any) => [
                  `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  name === "cumulativeIncome" ? "Cumulative Credits (+)" : "Cumulative Debits (-)",
                ]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Area
                type="monotone"
                dataKey="cumulativeIncome"
                name="cumulativeIncome"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incomeGradient)"
              />
              <Area
                type="monotone"
                dataKey="cumulativeSpend"
                name="cumulativeSpend"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#spendGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `Day ${v}`}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value: any, name: any) => [
                  `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  name === "dailyIncome" ? "Incoming (Credit)" : "Outgoing (Debit)",
                ]}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Bar dataKey="dailyIncome" name="dailyIncome" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dailySpend" name="dailySpend" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Credits / Income (Inflow)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-300">Debits / Spends (Outflow)</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          Aggregated across {data.length} data samples
        </span>
      </div>
    </div>
  );
}
