"use client";
import { useState, useRef, useEffect } from "react";
import { Waves, ArrowUp, PowerOff, Check, CheckCircle2 } from "lucide-react";
import { marked } from "marked";
import type { ChatMessage } from "@/lib/data";

function renderMd(text: string): string {
  marked.setOptions({ breaks: true, gfm: true });
  const html = marked.parse(text) as string;
  return html
    .replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;">')
    .replace(/<th>/g, '<th style="text-align:left;padding:4px 8px;border-bottom:1px solid #E2E8F0;font-weight:600;color:#0F1F33;">')
    .replace(/<td>/g, '<td style="padding:4px 8px;border-bottom:1px solid #E2E8F0;color:#64748B;">');
}

export function ChatPanel({
  messages,
  onSend,
  onApprove,
}: {
  messages: ChatMessage[];
  onSend?: (msg: string) => void;
  onApprove?: (action: ChatMessage["action"]) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setLoading(false);
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setLoading(true);
    onSend?.(input.trim());
    setInput("");
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-ink rounded-full flex items-center justify-center shrink-0">
            <Waves className="w-4 h-4 text-baby" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-ink">OceanPulse Advisor</h4>
            <p className="text-[11px] text-lt-slate">Ask anything about your infrastructure</p>
          </div>
        </div>
        <div className="text-[11px] text-lt-slate flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
          Online
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-[13px] leading-relaxed ${
              msg.role === "bot" ? "self-start max-w-[85%]" : "self-end max-w-[60%]"
            }`}
          >
            {msg.toast && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-sm text-xs font-medium text-[#16A34A] mb-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {msg.toast}
              </div>
            )}

            <div
              className={
                msg.role === "bot"
                  ? "bg-off-white border border-[#E2E8F0] rounded-tr-card rounded-br-card rounded-bl-card rounded-tl-[2px] px-4 py-3"
                  : "bg-ink text-white rounded-tl-card rounded-bl-card rounded-br-card rounded-tr-[2px] px-4 py-3"
              }
            >
              <div
                className="prose-sm [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:ml-4 [&>ul]:list-disc [&>ol]:ml-4 [&>ol]:list-decimal [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&_strong]:font-semibold [&_table]:my-2 [&_code]:bg-[#E2E8F0] [&_code]:px-1 [&_code]:rounded [&_code]:text-[12px]"
                dangerouslySetInnerHTML={{ __html: msg.role === "bot" ? renderMd(msg.content) : msg.content }}
              />

              {msg.action && (
                <div className="mt-2.5 bg-white border border-baby rounded-sm p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-deep mb-1.5">
                    <PowerOff className="w-3.5 h-3.5 text-blue" />
                    {msg.action.title}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[11px] text-slate mb-3">
                    <div><span className="font-semibold text-ink">Target</span><br />{msg.action.target}</div>
                    <div><span className="font-semibold text-ink">Saves</span><br />{msg.action.saves}</div>
                    <div><span className="font-semibold text-ink">Risk</span><br />{msg.action.risk}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove?.(msg.action!)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-ink text-white rounded-sm text-[11px] font-semibold hover:bg-deep transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                    <button className="px-3 py-1.5 border border-[#E2E8F0] rounded-sm text-[11px] font-medium text-slate hover:border-[#CBD5E1] transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`text-[10px] text-lt-slate mt-1 ${
                msg.role === "user" ? "text-right pr-0.5" : "pl-0.5"
              }`}
            >
              {msg.time}
            </div>
          </div>
        ))}

        {loading && (
          <div className="self-start max-w-[85%] text-[13px]">
            <div className="bg-off-white border border-[#E2E8F0] rounded-tr-card rounded-br-card rounded-bl-card rounded-tl-[2px] px-4 py-3 text-slate">
              <span className="animate-pulse">Analyzing your infrastructure...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-3 border-t border-[#E2E8F0] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder='Ask: "Why is my app slow?" or "How can I cut costs?"'
          className="flex-1 bg-off-white border border-[#E2E8F0] rounded-sm px-4 py-2.5 text-[13px] text-ink outline-none focus:border-blue transition-colors placeholder:text-lt-slate"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="w-10 h-10 bg-ink rounded-sm flex items-center justify-center shrink-0 hover:bg-deep transition-colors disabled:opacity-50"
        >
          <ArrowUp className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
