"use client";

import { useState } from "react";
import {
  Sparkles,
  User,
  Wallet,
  Landmark,
  Target,
  FolderTree,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Coins,
  ShieldCheck,
  FileSpreadsheet,
  Cpu,
  Plus,
  Trash2,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data?: any) => void;
}

interface AccountDraft {
  category: "bank" | "broker";
  institution_name: string;
  account_number: string;
  initial_balance: string;
}

export function OnboardingWizardModal({
  isOpen,
  onClose,
  onSuccess,
}: OnboardingWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal Profile
    name: "",
    email: "",
    base_currency: "INR",

    // Step 2: Income & Baseline
    monthly_salary: "150000",
    savings_target_pct: "30",

    // Step 4: System Paths & Daily Sync
    database_path: "%USERPROFILE%\\.finance_assistant\\finance.db",
    google_drive_ledger_path: "G:\\My Drive\\MonthlyLedger.xlsx",
    models_dir: "models",
    statements_dir: "FinancialStatements",
    auto_sync_enabled: true,

    // Step 5: Goals & Risk Profile
    financial_goal: "Wealth Accumulation & Early Retirement",
    risk_tolerance: "Moderate",
  });

  // Step 3: Multi-Account List
  const [accountsList, setAccountsList] = useState<AccountDraft[]>([
    {
      category: "bank",
      institution_name: "Central Bank of India",
      account_number: "4589",
      initial_balance: "50000",
    },
    {
      category: "broker",
      institution_name: "Zerodha",
      account_number: "Demat-1",
      initial_balance: "100000",
    },
  ]);

  // Account being added currently
  const [activeAccountType, setActiveAccountType] = useState<"bank" | "broker">("bank");
  const [draftAccount, setDraftAccount] = useState<AccountDraft>({
    category: "bank",
    institution_name: "",
    account_number: "",
    initial_balance: "0",
  });

  if (!isOpen) return null;

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1 && !formData.name.trim()) {
      setErrorMsg("Please enter your name to personalize your assistant.");
      return;
    }
    if (step === 2 && (!formData.monthly_salary || parseFloat(formData.monthly_salary) <= 0)) {
      setErrorMsg("Please enter a valid monthly net salary.");
      return;
    }
    if (step === 3 && accountsList.length === 0) {
      setErrorMsg("Please add at least one Bank or Broker account.");
      return;
    }
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) setStep(step - 1);
  };

  const handleAddAccountToList = () => {
    if (!draftAccount.institution_name.trim()) {
      setErrorMsg(draftAccount.category === "bank" ? "Please enter a Bank Name." : "Please enter a Broker Name.");
      return;
    }
    if (!draftAccount.account_number.trim()) {
      setErrorMsg("Please enter an Account Number.");
      return;
    }

    setAccountsList([
      ...accountsList,
      {
        ...draftAccount,
        category: activeAccountType,
        institution_name: draftAccount.institution_name.trim(),
        account_number: draftAccount.account_number.trim(),
      },
    ]);

    // Reset draft input
    setDraftAccount({
      category: activeAccountType,
      institution_name: "",
      account_number: "",
      initial_balance: "0",
    });
    setErrorMsg(null);
  };

  const handleRemoveAccount = (index: number) => {
    setAccountsList(accountsList.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Find primary bank and primary broker if available
      const primaryBank = accountsList.find((a) => a.category === "bank") || accountsList[0];
      const primaryBroker = accountsList.find((a) => a.category === "broker");

      const onboardingPayload = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        monthly_salary: parseFloat(formData.monthly_salary) || 100000,
        base_currency: formData.base_currency,
        bank_name: primaryBank ? primaryBank.institution_name : "Primary Bank",
        account_number: primaryBank ? primaryBank.account_number : "Primary",
        initial_balance: primaryBank ? parseFloat(primaryBank.initial_balance) || 0 : 0,
        demat_broker: primaryBroker ? primaryBroker.institution_name : undefined,
        financial_goal: formData.financial_goal,
        risk_tolerance: formData.risk_tolerance,
        savings_target_pct: parseFloat(formData.savings_target_pct) || 30,
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboardingPayload),
      });

      if (!res.ok) throw new Error("Failed to save onboarding configuration.");

      // 2. Add all additional accounts to settings
      for (const acc of accountsList) {
        // Skip primary bank as it is already seeded in onboarding
        if (primaryBank && acc === primaryBank) continue;
        await fetch(`${API_BASE_URL}/api/v1/settings/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institution_name: acc.institution_name,
            account_name: `${acc.institution_name} ${acc.category === "bank" ? "Account" : "Demat"}`,
            account_number: acc.account_number,
            type: acc.category === "bank" ? "checking" : "investment",
            currency: formData.base_currency,
            current_balance: parseFloat(acc.initial_balance) || 0,
          }),
        });
      }

      // 3. Save system paths & auto-sync preferences
      await fetch(`${API_BASE_URL}/api/v1/settings/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_drive_ledger_path: formData.google_drive_ledger_path,
          models_dir: formData.models_dir,
          auto_sync_enabled: formData.auto_sync_enabled,
        }),
      });

      const data = await res.json();
      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: "Profile", icon: User },
    { num: 2, title: "Income", icon: Wallet },
    { num: 3, title: "Accounts", icon: Landmark },
    { num: 4, title: "Paths", icon: FolderTree },
    { num: 5, title: "Goals", icon: Target },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header with Step Progress */}
        <div className="bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Welcome to AI Finance Assistant
                </h2>
                <p className="text-xs text-slate-400">
                  Configure your sovereign personal finance baseline
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Step {step} of 5
            </span>
          </div>

          {/* Stepper Breadcrumbs */}
          <div className="grid grid-cols-5 gap-1.5">
            {stepsList.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center justify-center sm:justify-start gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : isDone
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800/50 text-slate-500"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Wizard Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 touch-scroll">
          {/* STEP 1: PERSONAL PROFILE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prathamesh Rodi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Used by the Local AI Copilot to personalize insights and portfolio advisory reports.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. user@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Base Currency
                </label>
                <select
                  value={formData.base_currency}
                  onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: INCOME & CASH FLOW BASELINE */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Monthly Net Take-Home Salary ({formData.base_currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    {formData.base_currency === "INR" ? "₹" : "$"}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    required
                    placeholder="150000"
                    value={formData.monthly_salary}
                    onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Powers the 50/30/20 budget envelope, cumulative salary burn rate, and unallocated surplus calculations.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Savings & Investment Rate ({formData.savings_target_pct}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={formData.savings_target_pct}
                  onChange={(e) => setFormData({ ...formData, savings_target_pct: e.target.value })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>10% (Conservative)</span>
                  <span className="font-bold text-blue-400">30% (Recommended)</span>
                  <span>60% (Aggressive FIRE)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BANK & BROKER MULTI-ACCOUNTS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Connected Bank & Broker Accounts ({accountsList.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Add all the bank accounts and demat brokers you hold. You can add more anytime in Settings.
                </p>
              </div>

              {/* List of Added Accounts */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 touch-scroll">
                {accountsList.map((acc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300">
                        {acc.category === "broker" ? (
                          <Coins className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Landmark className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{acc.institution_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 font-mono">
                            {acc.category === "broker" ? "BROKER" : "BANK"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Acc: {acc.account_number} • Balance: {formData.base_currency === "INR" ? "₹" : "$"}{parseFloat(acc.initial_balance || "0").toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAccount(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                      title="Remove Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Account Form Box */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-dashed border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Add Account</span>
                  {/* Category Switcher */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAccountType("bank");
                        setDraftAccount({ ...draftAccount, category: "bank" });
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        activeAccountType === "bank"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAccountType("broker");
                        setDraftAccount({ ...draftAccount, category: "broker" });
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        activeAccountType === "broker"
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Broker
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      {activeAccountType === "bank" ? "Bank Name *" : "Broker Name *"}
                    </label>
                    <input
                      type="text"
                      placeholder={activeAccountType === "bank" ? "e.g. HDFC / SBI" : "e.g. Zerodha / Groww"}
                      value={draftAccount.institution_name}
                      onChange={(e) => setDraftAccount({ ...draftAccount, institution_name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Account Number / Last 4 *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4589 or 123456"
                      value={draftAccount.account_number}
                      onChange={(e) => setDraftAccount({ ...draftAccount, account_number: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    {activeAccountType === "bank"
                      ? `Initial Cash Balance (${formData.base_currency})`
                      : `Initial Investment Balance (${formData.base_currency})`}
                  </label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={draftAccount.initial_balance}
                    onChange={(e) => setDraftAccount({ ...draftAccount, initial_balance: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddAccountToList}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to List</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SYSTEM & FILE PATHS (DAILY EXCEL SYNC & MODELS) */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-blue-400" />
                  <span>SQLite Database File Location (finance.db)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\YourName\.finance_assistant\finance.db"
                  value={formData.database_path}
                  onChange={(e) => setFormData({ ...formData, database_path: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Persistent local storage directory for your financial ledger, portfolios, accounts, and insights.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Daily Excel Ledger File Path (Google Drive / Local)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. G:\My Drive\MonthlyLedger.xlsx or D:\Finances\MonthlyLedger.xlsx"
                  value={formData.google_drive_ledger_path}
                  onChange={(e) => setFormData({ ...formData, google_drive_ledger_path: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The Excel spreadsheet where your AI assistant writes and syncs daily categorized transactions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Models Storage Folder</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. D:\AI_Models or models"
                  value={formData.models_dir}
                  onChange={(e) => setFormData({ ...formData, models_dir: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Directory where direct GGUF model files (Llama 3.2 3B) are stored for in-process GPU execution.
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <input
                  type="checkbox"
                  id="auto_sync"
                  checked={formData.auto_sync_enabled}
                  onChange={(e) => setFormData({ ...formData, auto_sync_enabled: e.target.checked })}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
                <label htmlFor="auto_sync" className="text-xs text-slate-300 cursor-pointer">
                  <span className="font-bold">Enable Daily Background Excel Sync</span>
                  <span className="block text-[11px] text-slate-500">
                    Automatically watches the Excel ledger file and syncs updates every 5 minutes.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: GOALS & RISK PROFILE */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Primary Financial Goal
                </label>
                <select
                  value={formData.financial_goal}
                  onChange={(e) => setFormData({ ...formData, financial_goal: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Wealth Accumulation & Early Retirement">Wealth Accumulation & Early Retirement (FIRE)</option>
                  <option value="Building 6-Month Emergency Cushion">Building 6-Month Emergency Runway</option>
                  <option value="High Conviction Stock Investing">High Conviction Stock Investing (Alpha Generation)</option>
                  <option value="Expense Optimization & Debt Reduction">Expense Optimization & Leakage Reduction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Risk Tolerance
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Conservative", "Moderate", "Aggressive"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, risk_tolerance: r })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.risk_tolerance === r
                          ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>100% Local & Sovereign Guarantee</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  All your data, salary, accounts, and portfolios are stored locally inside your on-device SQLite database. Zero external telemetry or cloud tracking.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold"
            >
              Skip for Now
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Configuring Assistant...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Setup & Launch</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
