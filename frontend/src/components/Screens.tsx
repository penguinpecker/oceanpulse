"use client";
import { useState } from "react";
import {
  Waves, ScanLine, Lock, PiggyBank, ShieldCheck, Gauge,
  CheckCircle2, Loader2, Circle,
} from "lucide-react";
import type { ScanStep } from "@/lib/data";

export function OnboardScreen({
  onConnect,
}: {
  onConnect: (token: string) => void;
}) {
  const [token, setToken] = useState("");

  return (
    <div className="flex items-center justify-center py-20 px-8">
      <div className="bg-white border border-[#E2E8F0] rounded-card p-12 max-w-[500px] w-full text-center">
        <div className="w-14 h-14 bg-ink rounded-[14px] flex items-center justify-center mx-auto mb-5">
          <Waves className="w-7 h-7 text-baby" />
        </div>
        <h2 className="text-[22px] font-bold tracking-tight text-ink mb-2">
          Connect your infrastructure
        </h2>
        <p className="text-sm text-slate leading-relaxed mb-6">
          Paste your DigitalOcean API token. OceanPulse scans every Droplet,
          database, volume, and firewall — then tells you exactly what to fix.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && token && onConnect(token)}
            placeholder="dop_v1_abc123..."
            className="flex-1 px-3.5 py-3 bg-off-white border border-[#E2E8F0] rounded-sm text-[13px] font-mono text-ink outline-none focus:border-blue transition-colors placeholder:text-lt-slate"
          />
          <button
            onClick={() => token && onConnect(token)}
            className="flex items-center gap-1.5 px-6 py-3 bg-ink text-white rounded-sm text-[13px] font-semibold hover:bg-deep transition-colors whitespace-nowrap"
          >
            <ScanLine className="w-4 h-4" />
            Scan
          </button>
        </div>
        <div className="text-[11px] text-lt-slate flex items-center justify-center gap-1.5 mb-7">
          <Lock className="w-[13px] h-[13px]" />
          Read+Write scope required. Token is never stored.
        </div>
        <div className="grid grid-cols-3 gap-2.5 text-left">
          {[
            {
              Icon: PiggyBank,
              title: "Cost analysis",
              desc: "Find waste, right-size Droplets, kill idle GPUs",
            },
            {
              Icon: ShieldCheck,
              title: "Security audit",
              desc: "Firewalls, backups, VPC, open ports",
            },
            {
              Icon: Gauge,
              title: "Performance",
              desc: "CPU, memory, disk I/O bottleneck detection",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-3.5 bg-off-white rounded-sm border border-[#E2E8F0]"
            >
              <div className="w-7 h-7 bg-ice rounded-[7px] flex items-center justify-center mb-2">
                <f.Icon className="w-3.5 h-3.5 text-deep" />
              </div>
              <h5 className="text-xs font-semibold text-ink mb-1">{f.title}</h5>
              <p className="text-[11px] text-slate leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScanningScreen({ steps }: { steps: ScanStep[] }) {
  return (
    <div className="flex flex-col items-center py-24 gap-6">
      <div className="w-12 h-12 border-[2.5px] border-[#E2E8F0] border-t-ink rounded-full animate-spin-slow" />
      <h3 className="text-base font-semibold text-ink">
        Scanning your infrastructure
      </h3>
      <div className="flex flex-col gap-1.5 w-[280px]">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-[13px] ${
              s.status === "done"
                ? "text-[#22C55E]"
                : s.status === "active"
                  ? "text-ink font-medium"
                  : "text-lt-slate"
            }`}
          >
            {s.status === "done" && (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            {s.status === "active" && (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin-slow" />
            )}
            {s.status === "pending" && (
              <Circle className="w-4 h-4 shrink-0" />
            )}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
