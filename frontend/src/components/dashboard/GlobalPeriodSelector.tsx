"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ArrowRight, RotateCcw, RefreshCw } from "lucide-react";
import { DashboardPeriod } from "@/lib/types";

interface GlobalPeriodSelectorProps {
  currentPeriod?: DashboardPeriod;
  onSelectPeriod: (options: { year?: number; month?: number; date_from?: string; date_to?: string }) => void;
  onTriggerSync?: () => void;
  syncStatus?: { step?: string; message?: string; last_sync?: string };
}

export function GlobalPeriodSelector({
  currentPeriod,
  onSelectPeriod,
  onTriggerSync,
  syncStatus,
}: GlobalPeriodSelectorProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [selectedOption, setSelectedOption] = useState<string>(`${currentYear}-${currentMonth}`);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Past 12 Months
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const label =
      i === 0
        ? `Current Month (${d.toLocaleString("default", { month: "short", year: "numeric" })})`
        : d.toLocaleString("default", { month: "short", year: "numeric" });
    monthOptions.push({ value: `${y}-${m}`, year: y, month: m, label });
  }

  const handleSelectChange = (val: string) => {
    setSelectedOption(val);
    if (val === "custom") {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
      const [y, m] = val.split("-").map(Number);
      onSelectPeriod({ year: y, month: m });
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    onSelectPeriod({ date_from: startDate, date_to: endDate });
  };

  const handleResetToCurrent = () => {
    setSelectedOption(`${currentYear}-${currentMonth}`);
    setShowCustomRange(false);
    onSelectPeriod({ year: currentYear, month: currentMonth });
  };

  const isFiltered = selectedOption !== `${currentYear}-${currentMonth}`;

  return (
    <div className="bg-[#0f172a]/95 border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left: Active Period Indicator */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">Active Analysis Period</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {currentPeriod?.label || `${monthOptions[0].label}`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            All spend velocity, 50/30/20 budgets, and net balances reflect this period
          </p>
        </div>
      </div>

      {/* Right: Controls & Dropdown */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Month Dropdown */}
        <div className="relative">
          <select
            value={selectedOption}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="bg-slate-800/90 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors pr-7 appearance-none cursor-pointer font-medium"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value="custom">Custom Date Range...</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Button (Visible if past month or custom range is selected) */}
        {isFiltered && (
          <button
            onClick={handleResetToCurrent}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            title="Reset to current month"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Current Month</span>
          </button>
        )}
      </div>

      {/* Custom Range Drawer (if selected) */}
      {showCustomRange && (
        <form
          onSubmit={handleCustomSubmit}
          className="w-full pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
              required
            />
          </div>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
              required
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Apply to Entire Dashboard
          </button>
        </form>
      )}
    </div>
  );
}
