"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Brain,
  ShieldCheck,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calendar,
  Layers,
  PieChart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Repeat,
  Target,
  MessageSquareQuote,
  Loader2,
  Flame,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { API_BASE_URL } from "@/lib/api";

export default function BehavioralAnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiPrognosis, setAiPrognosis] = useState<string | null>(null);
  const [isGeneratingPrognosis, setIsGeneratingPrognosis] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/analytics/behavioral`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePrognosis = async () => {
    setIsGeneratingPrognosis(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/analytics/generate-prognosis`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setAiPrognosis(json.result?.ai_prognosis || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPrognosis(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <h2 className="text-base font-bold text-white">Analyzing Behavioral Spending Trends...</h2>
        <p className="text-xs text-slate-400">Evaluating 50/30/20 compliance, day-of-week patterns, and habit leakages.</p>
      </div>
    );
  }

  const {
    financial_health_score = 75,
    archetype = "Balanced Value Seeker",
    archetype_desc = "Maintains a healthy balance between lifestyle and savings.",
    emergency_runway_months = 5.4,
    monthly_salary = 100000.0,
    rule_503020 = {},
    monthly_trends = [],
    day_of_week_analysis = [],
    weekend_spend_pct = 42.0,
    category_analytics = [],
    recurring_subscriptions = [],
    annual_subscription_drain = 0,
    ai_prescriptions = [],
  } = data;

  const scoreColor =
    financial_health_score >= 80
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : financial_health_score >= 60
      ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
      : "text-amber-400 border-amber-500/30 bg-amber-500/10";

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
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>AI Behavioral Spending & Wealth Analytics</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Ollama AI Flow
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Psychological habit profiling, 50/30/20 budget compliance, weekend spending spikes, and subscription leakages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            <button
              onClick={handleGeneratePrognosis}
              disabled={isGeneratingPrognosis}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 active:scale-95"
            >
              <Brain className={`w-4 h-4 ${isGeneratingPrognosis ? "animate-pulse" : ""}`} />
              <span>{isGeneratingPrognosis ? "Running AI Diagnosis..." : "Run AI Behavioral Coach"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* 🌟 1. HERO BEHAVIORAL SCORE & PROFILING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Financial Health Score */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Financial Health Score</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black text-white">{financial_health_score}</h2>
              <span className="text-xs text-slate-400 font-bold">/ 100</span>
            </div>
            <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border inline-block ${scoreColor}`}>
              {financial_health_score >= 80 ? "Excellent Discipline" : financial_health_score >= 60 ? "Good Financial Shape" : "Needs Optimization"}
            </div>
          </div>

          {/* Behavioral Archetype */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Behavioral Archetype</span>
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-extrabold text-white tracking-tight">{archetype}</h3>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{archetype_desc}</p>
          </div>

          {/* Emergency Runway */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Emergency Buffer</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-3xl font-black text-emerald-400">{emergency_runway_months}</h2>
              <span className="text-xs text-slate-400 font-semibold">Months Runway</span>
            </div>
            <p className="text-[11px] text-slate-400">Living expenses secured in liquid cash.</p>
          </div>

          {/* Weekend Spend Concentration */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Weekend Spike Index</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-3xl font-black text-amber-400">{weekend_spend_pct}%</h2>
              <span className="text-xs text-slate-400 font-semibold">of debits on Fri-Sun</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {weekend_spend_pct > 45 ? "High weekend lifestyle clustering." : "Evenly distributed throughout the week."}
            </p>
          </div>
        </div>

        {/* 🌟 2. 50/30/20 BUDGET COMPLIANCE & SAVINGS VELOCITY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 50/30/20 Progress Bars */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">50/30/20 Budget Compliance</h3>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Monthly
              </span>
            </div>

            <div className="space-y-4">
              {/* Needs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">1. Fixed Needs (Rent, Bills, Food)</span>
                  <span className="font-mono font-bold text-blue-400">{rule_503020.needs_pct}% / 50%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(rule_503020.needs_pct, 100)}%` }}
                    className="bg-blue-500 h-full rounded-full transition-all"
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Spent: ₹{rule_503020.needs_spent?.toLocaleString("en-IN")}</span>
                  <span>Target: ₹{(monthly_salary * 0.5).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Wants */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">2. Discretionary Wants (Dining, Shopping)</span>
                  <span
                    className={`font-mono font-bold ${
                      rule_503020.wants_pct > 30 ? "text-amber-400" : "text-purple-400"
                    }`}
                  >
                    {rule_503020.wants_pct}% / 30%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(rule_503020.wants_pct, 100)}%` }}
                    className={`h-full rounded-full transition-all ${
                      rule_503020.wants_pct > 30 ? "bg-amber-500" : "bg-purple-500"
                    }`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Spent: ₹{rule_503020.wants_spent?.toLocaleString("en-IN")}</span>
                  <span>Target: ₹{(monthly_salary * 0.3).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Investments */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">3. Savings & Investments (Compounding)</span>
                  <span className="font-mono font-bold text-emerald-400">{rule_503020.invest_pct}% / 20%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(rule_503020.invest_pct, 100)}%` }}
                    className="bg-emerald-500 h-full rounded-full transition-all"
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Surplus: ₹{rule_503020.invest_spent?.toLocaleString("en-IN")}</span>
                  <span>Target: ₹{(monthly_salary * 0.2).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MoM Historical Trend Chart */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Month-over-Month Spending vs Savings Velocity</h3>
              </div>
              <span className="text-xs text-slate-400">6-Month Trend</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(v: any) => [`₹${v.toLocaleString("en-IN")}`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="income" name="Income / Salary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Spent (Debits)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="savings_surplus" name="Savings Surplus" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 🌟 3. DAY-OF-WEEK SPENDING HEATMAP & SUBSCRIPTION RADAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Day of Week Spend Distribution */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Day-of-Week Spending Heatmap</h3>
              </div>
              <span className="text-xs text-amber-400 font-semibold">
                Weekend Spike: {weekend_spend_pct}%
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-2">
              {day_of_week_analysis.map((d: any, idx: number) => {
                const maxDay = Math.max(...day_of_week_analysis.map((x: any) => x.total_spent), 1);
                const heightPct = Math.max((d.total_spent / maxDay) * 100, 15);

                return (
                  <div key={idx} className="flex flex-col items-center justify-end space-y-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      ₹{Math.round(d.total_spent / 1000)}k
                    </span>
                    <div className="w-full bg-slate-800 rounded-xl h-36 flex items-end p-1">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-lg transition-all ${
                          d.is_weekend ? "bg-gradient-to-t from-amber-600 to-amber-400" : "bg-gradient-to-t from-blue-600 to-blue-400"
                        }`}
                      />
                    </div>
                    <span className={`text-[11px] font-bold ${d.is_weekend ? "text-amber-300" : "text-slate-400"}`}>
                      {d.day.slice(0, 3)}
                    </span>
                    <span className="text-[9px] text-slate-500">{d.txn_count} txns</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recurring Subscriptions & Micro-Leakage Radar */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Recurring Subscriptions Radar</h3>
              </div>
              <span className="text-xs text-rose-400 font-bold">
                -₹{annual_subscription_drain.toLocaleString("en-IN")}/yr
              </span>
            </div>

            {recurring_subscriptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recurring subscription drains identified.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recurring_subscriptions.map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[180px]">{r.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {r.occurrences} payments · Avg ₹{r.avg_amount}/mo
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-rose-400">
                        -₹{r.annual_drain.toLocaleString("en-IN")}/yr
                      </span>
                      <span className="block text-[9px] text-slate-500 uppercase font-semibold">Annual Drain</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🌟 4. AI BEHAVIORAL COACH & ACTIONABLE PRESCRIPTIONS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Behavioral Coach & Wealth Optimization</h3>
                <p className="text-xs text-slate-400">Personalized prescriptions grounded in your live SQLite transactions</p>
              </div>
            </div>

            <button
              onClick={handleGeneratePrognosis}
              disabled={isGeneratingPrognosis}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
            >
              {isGeneratingPrognosis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Generate AI Diagnosis</span>
            </button>
          </div>

          {/* Prescriptions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ai_prescriptions.map((p: any, idx: number) => (
              <div
                key={idx}
                className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        p.priority === "High"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                          : p.priority === "Medium"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                      }`}
                    >
                      {p.priority} Priority
                    </span>
                    <Target className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{p.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Deep AI Prognosis Markdown Card */}
          {aiPrognosis && (
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Ollama AI Synthesis & 90-Day Wealth Trajectory</span>
              </div>
              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line prose prose-invert max-w-none">
                {aiPrognosis}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
