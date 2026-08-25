"use client";

import { PerformanceBenchmarkPoint } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Award } from "lucide-react";

interface BenchmarkLineChartProps {
  data: PerformanceBenchmarkPoint[];
}

export function BenchmarkLineChart({ data }: BenchmarkLineChartProps) {
  const latestPoint = data && data.length > 0 ? data[data.length - 1] : null;
  const portReturn = latestPoint ? latestPoint.portfolio_return : 0;
  const niftyReturn = latestPoint ? latestPoint.nifty_return : 0;
  const alphaVal = portReturn - niftyReturn;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Portfolio Alpha & Growth</h3>
            {latestPoint && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  alphaVal >= 0
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                <Award className="w-3 h-3" />
                <span>Alpha: {alphaVal >= 0 ? `+${alphaVal.toFixed(1)}%` : `${alphaVal.toFixed(1)}%`}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">Weighted real historical stock returns vs NIFTY 50 index</p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-200">
              My Portfolio ({portReturn >= 0 ? `+${portReturn.toFixed(1)}%` : `${portReturn.toFixed(1)}%`})
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
            <span className="text-slate-400">
              NIFTY 50 ({niftyReturn >= 0 ? `+${niftyReturn.toFixed(1)}%` : `${niftyReturn.toFixed(1)}%`})
            </span>
          </div>
        </div>
      </div>

      <div className="h-52 sm:h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: any, name: any) => [
                `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`,
                name === "portfolio_return" ? "My Portfolio" : "NIFTY 50",
              ]}
            />
            <Line
              type="monotone"
              dataKey="portfolio_return"
              name="My Portfolio"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10b981" }}
            />
            <Line
              type="monotone"
              dataKey="nifty_return"
              name="NIFTY 50"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
