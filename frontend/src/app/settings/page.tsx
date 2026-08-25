"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon,
  User,
  Landmark,
  FolderTree,
  Cpu,
  Save,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileSpreadsheet,
  Building2,
  Coins,
  Zap,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

interface AccountItem {
  id: string;
  institution_name: string;
  institution_type: string;
  account_name: string;
  account_number: string;
  type: string;
  currency: string;
  current_balance: number;
  is_active: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "accounts" | "paths" | "ai">("profile");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Accounts state
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [accountFormData, setAccountFormData] = useState({
    institution_name: "",
    account_name: "",
    account_number: "",
    type: "checking",
    currency: "INR",
    current_balance: "0",
  });

  // System Configuration Form State
  const [config, setConfig] = useState({
    name: "",
    email: "",
    monthly_salary: "150000",
    base_currency: "INR",
    google_drive_ledger_path: "",
    google_drive_ledger_exists: false,
    models_dir: "",
    models_dir_exists: false,
    statements_dir: "",
    statements_dir_exists: false,
    ollama_base_url: "http://localhost:11434",
    ollama_copilot_model: "llama3.2:3b",
    auto_sync_enabled: true,
    gpu_detected: true,
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Config
      const configRes = await fetch(`${API_BASE_URL}/api/v1/settings/config`);
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig({
          name: data.user?.name || "",
          email: data.user?.email || "",
          monthly_salary: data.user?.monthly_salary?.toString() || "150000",
          base_currency: data.user?.base_currency || "INR",
          google_drive_ledger_path: data.paths?.google_drive_ledger_path || "",
          google_drive_ledger_exists: data.paths?.google_drive_ledger_exists || false,
          models_dir: data.paths?.models_dir || "",
          models_dir_exists: data.paths?.models_dir_exists || false,
          statements_dir: data.paths?.statements_dir || "",
          statements_dir_exists: data.paths?.statements_dir_exists || false,
          ollama_base_url: data.ai?.ollama_base_url || "http://localhost:11434",
          ollama_copilot_model: data.ai?.ollama_copilot_model || "llama3.2:3b",
          auto_sync_enabled: data.ai?.auto_sync_enabled ?? true,
          gpu_detected: data.ai?.gpu_detected ?? true,
        });
      }

      // 2. Fetch Accounts
      const accountsRes = await fetch(`${API_BASE_URL}/api/v1/settings/accounts`);
      if (accountsRes.ok) {
        const accData = await accountsRes.json();
        setAccounts(accData.accounts || []);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        name: config.name,
        email: config.email,
        monthly_salary: parseFloat(config.monthly_salary) || 100000,
        base_currency: config.base_currency,
        google_drive_ledger_path: config.google_drive_ledger_path,
        models_dir: config.models_dir,
        statements_dir: config.statements_dir,
        ollama_base_url: config.ollama_base_url,
        ollama_copilot_model: config.ollama_copilot_model,
        auto_sync_enabled: config.auto_sync_enabled,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/settings/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save configuration.");

      setStatusMsg({ text: "Settings saved successfully!", type: "success" });
      fetchSettings();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to update settings.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncExcel = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/settings/sync-ledger`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        setStatusMsg({ text: data.message, type: "success" });
      } else {
        setStatusMsg({ text: data.message, type: "error" });
      }
    } catch (err: any) {
      setStatusMsg({ text: "Failed to trigger Excel sync.", type: "error" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenAccountModal = (acc?: AccountItem) => {
    if (acc) {
      setEditingAccount(acc);
      setAccountFormData({
        institution_name: acc.institution_name,
        account_name: acc.account_name,
        account_number: acc.account_number,
        type: acc.type,
        currency: acc.currency,
        current_balance: acc.current_balance.toString(),
      });
    } else {
      setEditingAccount(null);
      setAccountFormData({
        institution_name: "Central Bank of India",
        account_name: "Primary Savings",
        account_number: "4589",
        type: "checking",
        currency: config.base_currency || "INR",
        current_balance: "50000",
      });
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingAccount?.id || undefined,
        institution_name: accountFormData.institution_name.trim(),
        account_name: accountFormData.account_name.trim(),
        account_number: accountFormData.account_number.trim(),
        type: accountFormData.type,
        currency: accountFormData.currency,
        current_balance: parseFloat(accountFormData.current_balance) || 0,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/settings/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save account.");

      setIsAccountModalOpen(false);
      fetchSettings();
      setStatusMsg({ text: "Account saved successfully!", type: "success" });
    } catch (err: any) {
      alert(err.message || "Failed to save account.");
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete account "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/settings/accounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete account.");
      fetchSettings();
      setStatusMsg({ text: `Account ${name} deleted.`, type: "success" });
    } catch (err: any) {
      alert(err.message || "Failed to delete account.");
    }
  };

  const tabs = [
    { id: "profile", label: "User Profile", icon: User },
    { id: "accounts", label: "Bank & Demat Accounts", icon: Landmark },
    { id: "paths", label: "File Paths & Daily Sync", icon: FolderTree },
    { id: "ai", label: "AI Engine & Hardware", icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans selection:bg-blue-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  System Settings & Accounts Manager
                </h1>
                <p className="text-xs text-slate-400">
                  Configure user baseline, bank accounts, file paths, and AI hardware
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSettings}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Settings"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in text-xs font-semibold ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Tab Navigation */}
          <div className="space-y-1.5 lg:col-span-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Tab Content */}
          <div className="lg:col-span-3">
            {/* TAB 1: USER PROFILE & BASELINE */}
            {activeTab === "profile" && (
              <form onSubmit={handleSaveConfig} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Personal Profile & Financial Baseline</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Personal identity and monthly salary baseline used to calculate savings rate and burn runway.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                      placeholder="e.g. Prathamesh Rodi"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={config.email}
                      onChange={(e) => setConfig({ ...config, email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                      placeholder="e.g. user@local.finance"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Monthly Net Take-Home Salary ({config.base_currency})
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1000"
                      value={config.monthly_salary}
                      onChange={(e) => setConfig({ ...config, monthly_salary: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                      placeholder="150000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Base Currency
                    </label>
                    <select
                      value={config.base_currency}
                      onChange={(e) => setConfig({ ...config, base_currency: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="AED">AED (د.إ) - UAE Dirham</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Profile Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BANK & DEMAT ACCOUNTS MANAGER */}
            {activeTab === "accounts" && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-emerald-400" />
                      <span>Connected Accounts Manager</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Manage all your primary bank accounts, savings, credit cards, and demat brokers.
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenAccountModal()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Account</span>
                  </button>
                </div>

                {accounts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                    <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400">No bank or demat accounts configured yet.</p>
                    <button
                      onClick={() => handleOpenAccountModal()}
                      className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 text-blue-400 text-xs font-semibold hover:bg-slate-700"
                    >
                      + Add Your First Account
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
                            {acc.type === "investment" ? (
                              <Coins className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Landmark className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-white">{acc.account_name}</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700 font-mono">
                                {acc.institution_name}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {acc.account_number} • {acc.type.toUpperCase()}
                            </p>
                            <p className="text-xs font-bold text-emerald-400 font-mono mt-1">
                              {acc.currency === "INR" ? "₹" : "$"}
                              {acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenAccountModal(acc)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Edit Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc.id, acc.account_name)}
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/40 text-rose-400 transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FILE PATHS & DAILY SYNC ENGINE */}
            {activeTab === "paths" && (
              <form onSubmit={handleSaveConfig} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-purple-400" />
                      <span>System File Paths & Daily Synchronization</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure where your local AI models, statements, and Google Drive Excel ledger reside.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncExcel}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>Sync Excel Now</span>
                  </button>
                </div>

                <div className="space-y-5">
                  {/* SQLite Database Path */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-blue-400" />
                        <span>SQLite Database Location (finance.db)</span>
                      </label>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Primary Storage
                      </span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={config.statements_dir ? `${config.statements_dir}/../finance.db` : "C:\\Users\\YourName\\.finance_assistant\\finance.db"}
                      className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-300 font-mono focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Local SQLite file holding your transactions, accounts, categories, and investment portfolios.
                    </p>
                  </div>

                  {/* Daily Excel Ledger */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Daily Excel Ledger File Path (Google Drive / Local)</span>
                      </label>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          config.google_drive_ledger_exists
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {config.google_drive_ledger_exists ? "File Found" : "Not Found / Offline"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={config.google_drive_ledger_path}
                      onChange={(e) => setConfig({ ...config, google_drive_ledger_path: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      placeholder="e.g. G:\My Drive\MonthlyLedger.xlsx or D:\Finances\MonthlyLedger.xlsx"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      The Excel spreadsheet where transactions are continuously appended and synchronized.
                    </p>
                  </div>

                  {/* AI Models Storage Path */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        <span>AI Models Storage Folder (GGUF Weights)</span>
                      </label>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          config.models_dir_exists
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {config.models_dir_exists ? "Directory Ready" : "Default Folder"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={config.models_dir}
                      onChange={(e) => setConfig({ ...config, models_dir: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      placeholder="e.g. D:\AI_Models or models"
                    />
                  </div>

                  {/* Financial Statements Directory */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Financial Statements Storage Directory
                    </label>
                    <input
                      type="text"
                      value={config.statements_dir}
                      onChange={(e) => setConfig({ ...config, statements_dir: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      placeholder="FinancialStatements"
                    />
                  </div>

                  {/* Auto Sync Toggle */}
                  <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60">
                    <input
                      type="checkbox"
                      id="auto_sync_toggle"
                      checked={config.auto_sync_enabled}
                      onChange={(e) => setConfig({ ...config, auto_sync_enabled: e.target.checked })}
                      className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                    />
                    <label htmlFor="auto_sync_toggle" className="text-xs text-slate-300 cursor-pointer">
                      <span className="font-bold">Enable Daily Background Excel Sync</span>
                      <span className="block text-[11px] text-slate-500">
                        Automatically watches the Excel ledger file and syncs updates every 5 minutes.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Path Settings</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: AI COPILOT & HARDWARE */}
            {activeTab === "ai" && (
              <form onSubmit={handleSaveConfig} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span>AI Engine & Hardware Acceleration</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Local Ollama configuration and in-process GPU model inference settings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Ollama Base URL
                    </label>
                    <input
                      type="text"
                      value={config.ollama_base_url}
                      onChange={(e) => setConfig({ ...config, ollama_base_url: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      placeholder="http://localhost:11434"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Active Copilot LLM Model
                    </label>
                    <select
                      value={config.ollama_copilot_model}
                      onChange={(e) => setConfig({ ...config, ollama_copilot_model: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="llama3.2:3b">Llama 3.2 3B Instruct (Recommended)</option>
                      <option value="gemma2:2b">Gemma 2 2B (Ultra Fast)</option>
                      <option value="qwen2.5:7b">Qwen 2.5 7B (Deep Reasoning)</option>
                    </select>
                  </div>
                </div>

                {/* GPU Hardware Status Pill */}
                <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">NVIDIA CUDA GPU Hardware Acceleration</h3>
                      <p className="text-[11px] text-slate-400">
                        {config.gpu_detected
                          ? "CUDA Detected • Direct in-process GPU VRAM layer offloading enabled (n_gpu_layers=-1)"
                          : "CPU Mode • AVX2 acceleration enabled"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      config.gpu_detected
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {config.gpu_detected ? "Active (GPU)" : "CPU"}
                  </span>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save AI Configuration</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* MODAL: ADD / EDIT ACCOUNT */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              {accountFormData.type === "investment" ? (
                <Coins className="w-4 h-4 text-purple-400" />
              ) : (
                <Landmark className="w-4 h-4 text-emerald-400" />
              )}
              <span>{editingAccount ? "Edit Account" : "Add New Account"}</span>
            </h2>

            {/* Account Category Selector (Bank vs Broker) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setAccountFormData({ ...accountFormData, type: "checking" })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  accountFormData.type !== "investment"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Bank Account</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountFormData({ ...accountFormData, type: "investment" })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  accountFormData.type === "investment"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Broker / Demat</span>
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {accountFormData.type === "investment" ? "Broker Name *" : "Bank Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={accountFormData.type === "investment" ? "e.g. Zerodha / Groww / AngelOne" : "e.g. Central Bank of India / HDFC Bank"}
                  value={accountFormData.institution_name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, institution_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Account Number / Last 4 Digits *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4589 or 1234567890"
                  value={accountFormData.account_number}
                  onChange={(e) => setAccountFormData({ ...accountFormData, account_number: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Account Nickname (Optional)
                </label>
                <input
                  type="text"
                  placeholder={accountFormData.type === "investment" ? "e.g. Main Investment Demat" : "e.g. Salary Account / Emergency Fund"}
                  value={accountFormData.account_name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {accountFormData.type === "investment"
                    ? `Initial Investment / Portfolio Balance (${accountFormData.currency})`
                    : `Initial Cash Balance (${accountFormData.currency})`}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="50000"
                  value={accountFormData.current_balance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, current_balance: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {editingAccount ? "Update Account" : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 Mobile Sticky Bottom Navigation */}
      <MobileBottomNav pendingCount={0} />
    </div>
  );
}
