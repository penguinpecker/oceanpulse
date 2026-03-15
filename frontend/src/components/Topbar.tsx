"use client";
import { Waves, RefreshCw } from "lucide-react";

export function Topbar({
  connected,
  email,
  onRescan,
}: {
  connected: boolean;
  email?: string;
  onRescan?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-8 h-14 bg-white border-b border-[#E2E8F0] sticky top-0 z-50">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-ink rounded-[7px] flex items-center justify-center">
          <Waves className="w-4 h-4 text-baby" />
        </div>
        <span className="font-bold text-base tracking-tight text-ink">
          Ocean<span className="text-blue">Pulse</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {connected && (
          <>
            <button
              onClick={onRescan}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#E2E8F0] rounded-sm text-xs font-medium text-slate hover:border-[#CBD5E1] hover:text-ink transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-scan
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F0FDF4] border border-[#BBF7D0] rounded-full text-xs font-medium text-[#16A34A]">
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
              Connected
            </div>
            <div className="px-3 py-1 bg-ice rounded-full text-xs font-mono text-deep">
              {email || "team@startup.io"}
            </div>
          </>
        )}
        {!connected && (
          <div className="px-3 py-1 bg-ice rounded-full text-xs font-mono text-lt-slate">
            Not connected
          </div>
        )}
      </div>
    </div>
  );
}
