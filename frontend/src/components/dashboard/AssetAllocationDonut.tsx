"use client";

import { AssetAllocationItem } from "@/lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertCircle } from "lucide-react";

interface AssetAllocationDonutProps {
  data: AssetAllocationItem[];
}

export function AssetAllocationDonut({ data }: AssetAllocationDonutProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-white">Asset Allocation</h3>
          <p className="text-xs text-slate-400">Actual weights vs Target model</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Rebalance Gap</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
        <div className="h-48 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(value: any, name: any, item: any) => [
                  `₹${item.payload.amount.toLocaleString("en-IN")} (${value}%)`,
                  item.payload.name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-400 font-medium">Equity</span>
            <span className="text-lg font-bold text-white">62%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 text-xs">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-slate-300 font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{item.value}%</span>
                <span className="text-slate-500">/ {item.target}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
