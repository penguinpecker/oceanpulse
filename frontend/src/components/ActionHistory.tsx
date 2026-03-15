"use client";
import {
  Clock, ShieldCheck, PowerOff, ScanLine, Minimize2, ShieldPlus, Trash2,
} from "lucide-react";
import type { HistoryItem } from "@/lib/data";

const icons: Record<string, typeof ShieldCheck> = {
  shield: ShieldCheck,
  power: PowerOff,
  scan: ScanLine,
  resize: Minimize2,
  backup: ShieldPlus,
  delete: Trash2,
};

export function ActionHistory({ items }: { items: HistoryItem[] }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E2E8F0] text-[13px] font-semibold text-ink">
        <Clock className="w-4 h-4 text-slate" />
        Action history
      </div>
      {items.map((item) => {
        const Icon = icons[item.icon] || ScanLine;
        return (
          <div
            key={item.id}
            className="grid grid-cols-[28px_1fr_auto] gap-3 items-start px-5 py-3 border-b border-[#E2E8F0] last:border-b-0"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: item.iconBg }}
            >
              <Icon
                className="w-[13px] h-[13px]"
                style={{ color: item.iconColor }}
              />
            </div>
            <div>
              <h5 className="text-[13px] font-medium text-ink">{item.title}</h5>
              <p className="text-[11px] text-slate flex items-center gap-1.5 mt-0.5">
                <Clock className="w-[11px] h-[11px] text-lt-slate" />
                {item.time} · {item.detail}
              </p>
            </div>
            <div
              className="text-xs font-semibold font-mono whitespace-nowrap"
              style={{ color: item.impactColor }}
            >
              {item.impact}
            </div>
          </div>
        );
      })}
    </div>
  );
}
