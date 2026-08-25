"use client";

import { BudgetRadialItem } from "@/lib/types";

interface BudgetRadialRingProps {
  items: BudgetRadialItem[];
}

export function BudgetRadialRing({ items }: BudgetRadialRingProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">50/30/20 Salary Allocation</h3>
          <p className="text-xs text-slate-400">Needs vs Wants vs Surplus for Investing</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Healthy Velocity
        </span>
      </div>

      <div className="space-y-4 my-2">
        {items.map((item, idx) => {
          const isOver = item.pct > 100;
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="font-medium text-slate-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">₹{item.spent.toLocaleString("en-IN")}</span>
                  <span className="text-slate-400">/ ₹{item.target.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOver ? "ring-1 ring-rose-500" : ""}`}
                  style={{
                    width: `${Math.min(item.pct, 100)}%`,
                    backgroundColor: isOver ? "#f43f5e" : item.fill,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>Available Surplus: <strong className="text-emerald-400">₹38,800</strong></span>
        <span>Runway: <strong className="text-white">10 days left</strong></span>
      </div>
    </div>
  );
}
