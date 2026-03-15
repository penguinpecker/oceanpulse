"use client";
import { useState } from "react";
import {
  AlertTriangle, Wrench, PowerOff, Minimize2, ShieldPlus, Trash2,
} from "lucide-react";
import type { Issue } from "@/lib/data";

const iconMap: Record<string, typeof Wrench> = {
  create_firewall: Wrench,
  power_off: PowerOff,
  resize: Minimize2,
  enable_backups: ShieldPlus,
  delete_volume: Trash2,
};

const sevColors: Record<string, string> = {
  high: "bg-[#EF4444]",
  medium: "bg-[#F59E0B]",
  low: "bg-lt-slate",
};

const cats = ["All", "Cost", "Security", "Performance"] as const;

export function IssuesList({
  issues,
  onFix,
}: {
  issues: Issue[];
  onFix?: (issue: Issue) => void;
}) {
  const [filter, setFilter] = useState<string>("All");

  const filtered =
    filter === "All"
      ? issues
      : issues.filter(
          (i) => i.category.toLowerCase() === filter.toLowerCase()
        );

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <AlertTriangle className="w-4 h-4 text-slate" />
          Issues
          <span className="text-[11px] font-semibold bg-[#FEF2F2] text-[#EF4444] px-2 py-0.5 rounded-lg">
            {issues.length}
          </span>
        </div>
        <div className="flex gap-1">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filter === c
                  ? "bg-ink text-white"
                  : "text-slate hover:bg-ice"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      {filtered.map((issue) => {
        const Icon = iconMap[issue.action] || Wrench;
        return (
          <div
            key={issue.id}
            className="grid grid-cols-[4px_1fr_auto] gap-4 items-center px-5 py-3.5 border-b border-[#E2E8F0] last:border-b-0 hover:bg-off-white transition-colors"
          >
            <div className={`w-1 h-9 rounded-full ${sevColors[issue.severity]}`} />
            <div>
              <h4 className="text-[13px] font-semibold text-ink mb-0.5">
                {issue.title}
              </h4>
              <p className="text-xs text-slate">{issue.description}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {issue.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] font-mono text-lt-slate bg-off-white px-2 py-0.5 rounded"
                  >
                    {t}
                  </span>
                ))}
                {issue.savings && (
                  <span className="text-[11px] font-semibold text-[#16A34A]">
                    {issue.savings}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onFix?.(issue)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ink text-white rounded-sm text-[11px] font-semibold hover:bg-deep transition-colors"
              >
                <Icon className="w-3 h-3" />
                {issue.actionLabel}
              </button>
              <button className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-sm text-[11px] font-medium text-lt-slate hover:text-slate hover:border-[#CBD5E1] transition-colors">
                Skip
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
