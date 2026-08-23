"use client";

import { useState } from "react";
import { ChatMessage } from "@/lib/types";
import { Bot, Send, User, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";

interface CopilotChatProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (msg: string) => void;
}

export function CopilotChat({ messages, isStreaming, onSendMessage }: CopilotChatProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input);
    setInput("");
  };

  const samplePrompts = [
    "Analyze my salary consumption this month",
    "Can I afford to invest ₹30k in INFY right now?",
    "How is my portfolio performing compared to NIFTY 50?",
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[520px] shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Local Ollama Copilot</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                100% On-Device
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Verifiable spend analysis & stock suggestion engine</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 touch-scroll">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`p-1.5 rounded-lg text-xs ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.evidence_id && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Evidence Verified: {msg.evidence_id}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Ollama reasoning locally...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Chips */}
      <div className="px-3 py-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(prompt)}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Ollama about spends, salary runway, or stock suggestions..."
          className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
