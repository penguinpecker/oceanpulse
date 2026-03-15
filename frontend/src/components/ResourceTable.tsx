"use client";
import { useState } from "react";
import type { Resource, BadgeVariant } from "@/lib/data";

const tabs = ["Droplets (4)", "Databases (1)", "Volumes (2)", "LBs (1)"];

const badgeStyles: Record<BadgeVariant, string> = {
  ok: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
  warn: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
  bad: "bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]",
  info: "bg-ice text-deep border-baby",
};

function usageColor(pct: number) {
  if (pct > 70) return "#F59E0B";
  if (pct > 50) return "#F59E0B";
  if (pct < 15) return "#EF4444";
  return "#22C55E";
}

export function ResourceTable({ resources }: { resources: Resource[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0]">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActive(i)}
            className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              active === i
                ? "text-ink border-ink"
                : "text-slate border-transparent hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-off-white">
            {["Name", "Size", "CPU", "Memory", "Status", "Cost"].map((h) => (
              <th
                key={h}
                className="text-left text-[10px] font-semibold text-lt-slate uppercase tracking-wider px-5 py-2.5 border-b border-[#E2E8F0]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => (
            <tr
              key={r.id}
              className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-off-white transition-colors"
            >
              <td className="px-5 py-3">
                <div className="text-[13px] font-semibold text-ink">
                  {r.name}
                </div>
                <div className="text-[11px] font-mono text-lt-slate">
                  {r.meta}
                </div>
              </td>
              <td className="px-5 py-3 text-[11px] font-mono text-lt-slate">
                {r.size}
              </td>
              <td className="px-5 py-3">
                <span className="inline-block w-16 h-[5px] bg-ice rounded-full overflow-hidden align-middle mr-1.5">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${r.cpu}%`,
                      background: usageColor(r.cpu),
                    }}
                  />
                </span>
                <span className="text-xs font-mono text-slate">{r.cpu}%</span>
              </td>
              <td className="px-5 py-3">
                <span className="inline-block w-16 h-[5px] bg-ice rounded-full overflow-hidden align-middle mr-1.5">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${r.memory}%`,
                      background: usageColor(r.memory),
                    }}
                  />
                </span>
                <span className="text-xs font-mono text-slate">
                  {r.memory}%
                </span>
              </td>
              <td className="px-5 py-3">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyles[r.statusVariant]}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-5 py-3 text-[13px] font-mono font-medium text-ink">
                {r.cost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
