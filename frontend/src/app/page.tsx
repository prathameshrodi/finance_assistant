"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDashboardWebSocket } from "@/hooks/useDashboardWebSocket";
import { API_BASE_URL } from "@/lib/api";
import { MetricsHero } from "@/components/dashboard/MetricsHero";
import { GlobalPeriodSelector } from "@/components/dashboard/GlobalPeriodSelector";
import { SpendVelocityChart } from "@/components/dashboard/SpendVelocityChart";
import { BudgetRadialRing } from "@/components/dashboard/BudgetRadialRing";
import { AssetAllocationDonut } from "@/components/dashboard/AssetAllocationDonut";
import { BenchmarkLineChart } from "@/components/dashboard/BenchmarkLineChart";
import { OpportunityRadar } from "@/components/dashboard/OpportunityRadar";
import { CopilotChat } from "@/components/dashboard/CopilotChat";
import { StatementUploadModal } from "@/components/dashboard/StatementUploadModal";
import {
  Zap,
  RefreshCw,
  Layers,
  ShieldCheck,
  Activity,
  UploadCloud,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Bell,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  TrendingUp,
  Brain,
} from "lucide-react";

interface PipelineJob {
  status: "running" | "completed" | "error";
  filename: string;
  stage: number; // 1 to 4
  stepTitle: string;
  stagedCount?: number;
  message?: string;
}

export default function DashboardPage() {
  const {
    isConnected,
    dashboardData,
    syncStatus,
    messages,
    isStreaming,
    triggerSync,
    fetchDashboardForPeriod,
    sendChatMessage,
  } = useDashboardWebSocket();

  const [activeMobileTab, setActiveMobileTab] = useState<"overview" | "spends" | "wealth" | "radar" | "copilot">("overview");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<PipelineJob | null>(null);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Background LangGraph Pipeline Handler
  const handleStartPipeline = async (file: File, statementType: string, skipStaging: boolean = true) => {
    setActiveJob({
      status: "running",
      filename: file.name,
      stage: 1,
      stepTitle: file.name.endsWith(".xlsx") || file.name.endsWith(".xls") ? "Routing to Excel Engine..." : "Routing to PDF Extractor...",
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("statement_type", statementType);
    formData.append("skip_staging", skipStaging.toString());

    // Simulate stage visualizer while request is in flight
    const timer1 = setTimeout(() => {
      setActiveJob((prev) => prev && prev.status === "running" ? { ...prev, stage: 2, stepTitle: "Injecting SQLite Grounding Context..." } : prev);
    }, 800);

    const timer2 = setTimeout(() => {
      setActiveJob((prev) => prev && prev.status === "running" ? { ...prev, stage: 3, stepTitle: "Ollama Local AI Structuring JSON..." } : prev);
    }, 1800);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/upload-statement`, {
        method: "POST",
        body: formData,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const result = await response.json();

      if (response.ok) {
        const count = result.committed_count !== undefined 
          ? result.committed_count 
          : (result.staged_transactions?.length || 0) + (result.staged_holdings?.length || 0);

        setActiveJob({
          status: "completed",
          filename: file.name,
          stage: 4,
          stepTitle: skipStaging ? "Directly Committed to Live Ledger" : "Staging Complete & Deduplicated",
          stagedCount: count,
          message: skipStaging ? `Committed ${count} records directly to live ledger.` : `Staged ${count} transactions ready for verification.`,
        });
        triggerSync();
      } else {
        setActiveJob({
          status: "error",
          filename: file.name,
          stage: 1,
          stepTitle: "Ingestion Failed",
          message: result.detail || "Error processing file.",
        });
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setActiveJob({
        status: "error",
        filename: file.name,
        stage: 1,
        stepTitle: "Connection Error",
        message: "Failed to connect to backend on port 8000.",
      });
    }
  };

  if (!dashboardData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center animate-pulse mb-4 border border-blue-500/20">
          <Activity className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Connecting to Local AI Assistant...</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          Establishing WebSocket connection with local backend on <code className="text-blue-400">ws://127.0.0.1:8000/ws</code>
        </p>
      </div>
    );
  }

  const { period, user, hero_metrics, charts, opportunities } = dashboardData;
  const pendingCount = hero_metrics.pending_staged_count || 0;

  return (
    <div className="flex-1 flex flex-col min-h-[100dvh] pb-safe relative">
      {/* 🌟 TOP-RIGHT FLOATING LIVE STATUS / NOTIFICATION WIDGET */}
      {activeJob && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl space-y-3 ${
              activeJob.status === "running"
                ? "bg-slate-900/95 border-blue-500/40 shadow-blue-500/10 text-white"
                : activeJob.status === "completed"
                ? "bg-slate-900/95 border-emerald-500/40 shadow-emerald-500/10 text-white"
                : "bg-slate-900/95 border-rose-500/40 shadow-rose-500/10 text-white"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                {activeJob.status === "running" ? (
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : activeJob.status === "completed" ? (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white tracking-tight">
                      {activeJob.status === "running"
                        ? "LangGraph Pipeline Active"
                        : activeJob.status === "completed"
                        ? "Ingestion Completed"
                        : "Ingestion Error"}
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Step {activeJob.stage}/4
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium truncate max-w-[200px] mt-0.5">
                    {activeJob.filename}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Current Step */}
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-xs text-slate-300 flex items-center justify-between">
              <span className="font-medium">{activeJob.stepTitle}</span>
              {activeJob.status === "running" && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              )}
            </div>

            {/* Progress Bar (Running) */}
            {activeJob.status === "running" && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${(activeJob.stage / 4) * 100}%` }}
                />
              </div>
            )}

            {/* Actions on Completed */}
            {activeJob.status === "completed" && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-400 font-semibold">
                  +{activeJob.stagedCount} rows processed
                </span>
                <Link
                  href={activeJob.stepTitle.includes("Live Ledger") ? "/ledger" : "/staged-transactions"}
                  onClick={() => setActiveJob(null)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-600/20"
                >
                  <span>{activeJob.stepTitle.includes("Live Ledger") ? "View in Ledger" : "Review Staged"}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. Header */}
      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white font-black text-sm tracking-tight shadow-md shadow-blue-600/20">
              FA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">Finance AI Assistant</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hidden sm:inline-block">
                  Ollama Local Edition
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Welcome back, <span className="text-slate-200 font-medium">{user.name}</span>
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Staged Transactions Page Link */}
            {pendingCount > 0 && (
              <Link
                href="/staged-transactions"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold shadow-sm transition-all animate-pulse active:scale-95"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Review Staged ({pendingCount})</span>
              </Link>
            )}

            {/* AI Behavioral Spending Analytics Link */}
            <Link
              href="/analytics"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold shadow-sm transition-all active:scale-95"
              title="AI Behavioral Spending Habits, 50/30/20 & Wealth Analytics"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Spending Analytics</span>
            </Link>

            {/* Watchlist & 6-Pillar Stock Research Link */}
            <Link
              href="/watchlist"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition-all active:scale-95"
              title="Stock Watchlist & 6-Pillar Deep Fundamental/Technical Research"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Watchlist</span>
            </Link>

            {/* Ledger & Holdings Manager CRUD Link */}
            <Link
              href="/ledger"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition-all active:scale-95"
              title="View & Edit Transactions & Portfolio Holdings"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Ledger</span>
            </Link>

            {/* Upload Statement Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition-all active:scale-95"
              title="Upload Bank or Demat Statement"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Upload Statement</span>
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Notifications & Pipeline Status"
            >
              <Bell className="w-4 h-4" />
              {(pendingCount > 0 || activeJob) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              )}
            </button>

            {/* Connection Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="hidden sm:inline">{isConnected ? "Ollama Connected" : "Connecting..."}</span>
            </div>
          </div>
        </div>
      </header>

      {/* NOTIFICATION DRAWER / POPOVER */}
      {showNotificationDrawer && (
        <div className="fixed top-16 right-4 z-40 max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              <span>Activity & Notifications</span>
            </h4>
            <button onClick={() => setShowNotificationDrawer(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-300">
                    {pendingCount} Staged Records Awaiting Review
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Verify account mappings, categories, and amounts before committing to SQLite.
                  </p>
                  <Link
                    href="/staged-transactions"
                    onClick={() => setShowNotificationDrawer(false)}
                    className="inline-block text-[11px] font-bold text-amber-400 hover:underline mt-1.5"
                  >
                    Open Review Workspace →
                  </Link>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Google Drive Ledger Watcher</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Monitoring <code className="text-blue-400">MonthlyLedger.xlsx</code>. Automatically stages updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Staged Transactions Review Banner */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 via-blue-500/10 to-amber-500/20 border-b border-amber-500/30 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-bold">Human-in-the-Loop Review Area:</span>
              <span className="text-slate-300">
                You have <span className="text-white font-extrabold">{pendingCount}</span> unconfirmed statement records.
              </span>
            </div>
            <Link
              href="/staged-transactions"
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
            >
              <span>Review Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <GlobalPeriodSelector
          currentPeriod={period}
          onSelectPeriod={fetchDashboardForPeriod}
          onTriggerSync={triggerSync}
          syncStatus={syncStatus}
        />

        <MetricsHero metrics={hero_metrics} currency={user.base_currency} />

        {/* Mobile Tab Selector */}
        <div className="flex lg:hidden overflow-x-auto gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          {[
            { id: "overview", label: "Overview" },
            { id: "spends", label: "Spends" },
            { id: "wealth", label: "Wealth" },
            { id: "radar", label: "Opportunity Radar" },
            { id: "copilot", label: "AI Copilot" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMobileTab(tab.id as any)}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                activeMobileTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div
            className={`lg:col-span-7 space-y-5 ${
              activeMobileTab !== "overview" && activeMobileTab !== "spends" && activeMobileTab !== "wealth"
                ? "hidden lg:block"
                : ""
            }`}
          >
            {(activeMobileTab === "overview" || activeMobileTab === "spends") && (
              <div className="grid grid-cols-1 gap-5">
                <SpendVelocityChart
                  data={charts.spend_velocity}
                  monthlySalary={user.monthly_salary}
                  meta={charts.spend_velocity_meta}
                />
                <BudgetRadialRing items={charts.budget_503020} />
              </div>
            )}

            {(activeMobileTab === "overview" || activeMobileTab === "wealth") && (
              <div className="grid grid-cols-1 gap-5">
                <AssetAllocationDonut data={charts.asset_allocation} />
                <BenchmarkLineChart data={charts.performance_benchmark} />
              </div>
            )}
          </div>

          <div
            className={`lg:col-span-5 space-y-5 ${
              activeMobileTab !== "overview" && activeMobileTab !== "radar" && activeMobileTab !== "copilot"
                ? "hidden lg:block"
                : ""
            }`}
          >
            {(activeMobileTab === "overview" || activeMobileTab === "radar") && (
              <OpportunityRadar
                opportunities={opportunities}
                onSelectSuggestion={(sym) => sendChatMessage(`Tell me more about why ${sym} is a good buy based on my current cash surplus.`)}
              />
            )}

            {(activeMobileTab === "overview" || activeMobileTab === "copilot") && (
              <CopilotChat
                messages={messages}
                isStreaming={isStreaming}
                onSendMessage={sendChatMessage}
              />
            )}
          </div>
        </div>
      </main>

      <StatementUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onStartPipeline={handleStartPipeline}
      />
    </div>
  );
}
