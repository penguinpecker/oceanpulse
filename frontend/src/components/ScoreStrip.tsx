"use client";
import { Activity, PiggyBank, Gauge, ShieldAlert, Boxes } from "lucide-react";
import type { HealthScores } from "@/lib/data";

const metrics = [
  { key: "cost" as const, label: "Cost", Icon: PiggyBank, color: "#D97706", bg: "#FFFBEB" },
  { key: "performance" as const, label: "Performance", Icon: Gauge, color: "#16A34A", bg: "#F0FDF4" },
  { key: "security" as const, label: "Security", Icon: ShieldAlert, color: "#EF4444", bg: "#FEF2F2" },
  { key: "architecture" as const, label: "Architecture", Icon: Boxes, color: "#1B3A5C", bg: "#EBF2FF" },
];

export function ScoreStrip({ scores }: { scores: HealthScores }) {
  return (
    <div className="grid grid-cols-5 gap-px bg-[#E2E8F0] rounded-card overflow-hidden">
      {/* Hero cell */}
      <div className="bg-ink p-5 text-center">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2.5"
          style={{ background: "rgba(184,212,240,0.15)" }}
        >
          <Activity className="w-4 h-4 text-baby" />
        </div>
        <div className="text-[32px] font-bold tracking-tighter leading-none text-white mb-1">
          {scores.overall}
        </div>
        <div className="text-[11px] font-medium text-baby uppercase tracking-wider">
          Overall
        </div>
      </div>

      {/* Metric cells */}
      {metrics.map((m) => {
        const value = scores[m.key];
        const delta =
          m.key === "cost"
            ? { text: "-$47/mo waste", bg: "#FEF2F2", color: "#EF4444" }
            : m.key === "security"
              ? { text: "3 critical", bg: "#FEF2F2", color: "#EF4444" }
              : null;

        return (
          <div key={m.key} className="bg-white p-5 text-center">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2.5"
              style={{ background: m.bg }}
            >
              <m.Icon className="w-4 h-4" style={{ color: m.color }} />
            </div>
            <div
              className="text-[32px] font-bold tracking-tighter leading-none mb-1"
              style={{ color: m.color }}
            >
              {value}
            </div>
            <div className="text-[11px] font-medium text-slate uppercase tracking-wider">
              {m.label}
            </div>
            <div className="h-[3px] bg-ice rounded-full mt-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${value}%`, background: m.color }}
              />
            </div>
            {delta && (
              <span
                className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-lg mt-1.5"
                style={{ background: delta.bg, color: delta.color }}
              >
                {delta.text}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
