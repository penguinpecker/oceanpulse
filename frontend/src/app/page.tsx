"use client";
import { useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { ScoreStrip } from "@/components/ScoreStrip";
import { IssuesList } from "@/components/IssuesList";
import { ResourceTable } from "@/components/ResourceTable";
import { ChatPanel } from "@/components/ChatPanel";
import { ActionHistory } from "@/components/ActionHistory";
import { OnboardScreen, ScanningScreen } from "@/components/Screens";
import type {
  ChatMessage, Issue, HealthScores, Resource, HistoryItem, ScanStep,
} from "@/lib/data";

type Screen = "onboard" | "scanning" | "dashboard";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("onboard");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [scores, setScores] = useState<HealthScores>({ overall: 0, cost: 0, performance: 0, security: 0, architecture: 0 });
  const [issues, setIssues] = useState<Issue[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scanSteps, setScanSteps] = useState<ScanStep[]>([]);

  const handleConnect = useCallback(async (tk: string) => {
    setToken(tk);
    setScreen("scanning");

    const steps: ScanStep[] = [
      { label: "Validating token...", status: "active" },
      { label: "Inventorying Droplets", status: "pending" },
      { label: "Inventorying databases", status: "pending" },
      { label: "Checking firewalls", status: "pending" },
      { label: "Analyzing costs", status: "pending" },
      { label: "Generating report", status: "pending" },
    ];
    setScanSteps([...steps]);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ do_token: tk }),
      });

      for (let i = 0; i < steps.length; i++) {
        steps[i].status = "done";
        if (i + 1 < steps.length) steps[i + 1].status = "active";
        setScanSteps([...steps]);
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!res.ok) throw new Error("Scan failed");
      const data = await res.json();

      setEmail(data.account?.email || "connected");
      setScores(data.scores || { overall: 0, cost: 0, performance: 0, security: 0, architecture: 0 });
      setIssues(data.issues || []);
      setResources(data.resources || []);

      setHistory([{
        id: "scan-1",
        icon: "scan" as const,
        iconColor: "#1B3A5C",
        iconBg: "#EBF2FF",
        title: "Initial scan completed",
        time: "Just now",
        detail: `${data.summary?.total_droplets || 0} Droplets, ${data.summary?.total_databases || 0} DBs, ${data.summary?.total_volumes || 0} volumes`,
        impact: "Baseline",
        impactColor: "#94A3B8",
      }]);

      const s = data.summary || {};
      const ic = (data.issues || []).length;
      const hc = (data.issues || []).filter((i: Issue) => i.severity === "high").length;

      setMessages([{
        id: "welcome",
        role: "bot",
        content: `I've scanned your account. You have **${s.total_droplets || 0} Droplets**, **${s.total_databases || 0} databases**, and **${s.total_volumes || 0} volumes**. Total monthly spend: **$${s.total_monthly_cost || 0}**.\n\nFound ${ic} issues${hc > 0 ? ` — ${hc} critical` : ""}. What would you like to tackle first?`,
        time: "Just now",
      }]);

      setScreen("dashboard");
    } catch (err) {
      console.error("Scan error:", err);
      setEmail("error");
      setMessages([{
        id: "err",
        role: "bot",
        content: "Failed to scan your account. Make sure your API token has read+write access and try again.",
        time: "Just now",
      }]);
      setScreen("dashboard");
    }
  }, []);

  const handleRescan = useCallback(() => {
    if (token) handleConnect(token);
  }, [token, handleConnect]);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        time: "Just now",
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, do_token: token }),
        });
        const data = await res.json();
        setMessages((prev) => [...prev, {
          id: `b-${Date.now()}`,
          role: "bot",
          content: data.response || "Let me check on that...",
          time: "Just now",
        }]);
      } catch {
        setMessages((prev) => [...prev, {
          id: `b-${Date.now()}`,
          role: "bot",
          content: "Connection issue. Try again in a moment.",
          time: "Just now",
        }]);
      }
    },
    [token]
  );

  const handleFix = useCallback((issue: Issue) => {
    const botMsg: ChatMessage = {
      id: `fix-${Date.now()}`,
      role: "bot",
      content: `I'll handle **${issue.title}**. Here's what I'll do:`,
      time: "Just now",
      action: {
        title: `${issue.actionLabel}: ${issue.title}`,
        target: issue.resource_id ? `ID: ${issue.resource_id}` : issue.tags[0] || "resource",
        saves: issue.savings || "Improved security posture",
        risk: issue.action === "power_off" ? "Running processes will stop" :
              issue.action === "resize_droplet" ? "Brief downtime during resize" :
              issue.action === "delete_volume" ? "Data will be permanently lost" :
              "Minimal risk",
      },
    };
    setMessages((prev) => [...prev, botMsg]);
  }, []);

  const handleApprove = useCallback(
    async (action: ChatMessage["action"]) => {
      const matchingIssue = issues.find((i) =>
        action?.title?.includes(i.title)
      );

      let success = false;
      if (matchingIssue && token) {
        try {
          const res = await fetch("/api/fix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              do_token: token,
              action: matchingIssue.action,
              resource_id: matchingIssue.resource_id || matchingIssue.tags[0],
            }),
          });
          const result = await res.json();
          success = result.success === true;
        } catch {
          success = false;
        }
      }

      setMessages((prev) => [...prev, {
        id: `ok-${Date.now()}`,
        role: "bot",
        content: success
          ? "Done! What else would you like me to look at?"
          : "I wasn't able to complete that action. The resource ID might have changed — try re-scanning.",
        time: "Just now",
        toast: success ? `${action?.title} completed successfully.` : undefined,
      }]);

      if (success) {
        setHistory((prev) => [{
          id: `h-${Date.now()}`,
          icon: "shield" as const,
          iconColor: "#16A34A",
          iconBg: "#F0FDF4",
          title: action?.title || "Action completed",
          time: "Just now",
          detail: `Saves ${action?.saves || "resources"}`,
          impact: action?.saves || "Done",
          impactColor: "#16A34A",
        }, ...prev]);

        if (matchingIssue) {
          setIssues((prev) => prev.filter((i) => i.id !== matchingIssue.id));
        }
      }
    },
    [issues, token]
  );

  return (
    <div className="min-h-screen">
      <Topbar connected={screen === "dashboard"} email={email} onRescan={handleRescan} />

      {screen === "onboard" && <OnboardScreen onConnect={handleConnect} />}
      {screen === "scanning" && <ScanningScreen steps={scanSteps} />}

      {screen === "dashboard" && (
        <div className="max-w-[1360px] mx-auto px-8 py-6 flex flex-col gap-5">
          <ScoreStrip scores={scores} />
          <ChatPanel messages={messages} onSend={handleSend} onApprove={handleApprove} />
          <div className="grid grid-cols-[1fr_340px] gap-5">
            <div className="flex flex-col gap-5">
              <IssuesList issues={issues} onFix={handleFix} />
              <ResourceTable resources={resources} />
            </div>
            <ActionHistory items={history} />
          </div>
        </div>
      )}
    </div>
  );
}
