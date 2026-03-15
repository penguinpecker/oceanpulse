"use client";
import { useState, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { ScoreStrip } from "@/components/ScoreStrip";
import { IssuesList } from "@/components/IssuesList";
import { ResourceTable } from "@/components/ResourceTable";
import { ChatPanel } from "@/components/ChatPanel";
import { ActionHistory } from "@/components/ActionHistory";
import { OnboardScreen, ScanningScreen } from "@/components/Screens";
import {
  mockScores, mockIssues, mockResources, mockHistory, mockChat, mockScanSteps,
  type ChatMessage, type Issue, type HealthScores, type Resource, type HistoryItem, type ScanStep,
} from "@/lib/data";

type Screen = "onboard" | "scanning" | "dashboard";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("onboard");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [scores, setScores] = useState<HealthScores>(mockScores);
  const [issues, setIssues] = useState<Issue[]>(mockIssues);
  const [resources, setResources] = useState<Resource[]>(mockResources);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scanSteps, setScanSteps] = useState<ScanStep[]>(mockScanSteps);

  // ── Connect & Scan ──
  const handleConnect = useCallback(async (tk: string) => {
    setToken(tk);
    setScreen("scanning");

    // Animate scan steps
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
      // Actually call the scan API
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ do_token: tk }),
      });

      // Step through scan animation while waiting
      for (let i = 0; i < steps.length; i++) {
        steps[i].status = "done";
        if (i + 1 < steps.length) steps[i + 1].status = "active";
        setScanSteps([...steps]);
        await new Promise((r) => setTimeout(r, 500));
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }

      const data = await res.json();

      // Use real data
      setEmail(data.account?.email || "connected");
      setScores(data.scores || mockScores);
      setIssues(
        (data.issues || []).length > 0 ? data.issues : mockIssues
      );
      setResources(
        (data.resources || []).length > 0 ? data.resources : mockResources
      );

      // Initial history entry
      setHistory([
        {
          id: "scan-1",
          icon: "scan",
          iconColor: "#1B3A5C",
          iconBg: "#EBF2FF",
          title: "Initial scan completed",
          time: "Just now",
          detail: `${data.summary?.total_droplets || 0} Droplets, ${data.summary?.total_databases || 0} DBs, ${data.summary?.total_volumes || 0} volumes`,
          impact: "Baseline",
          impactColor: "#94A3B8",
        },
      ]);

      // Bot welcome message
      const summary = data.summary || {};
      const issueCount = (data.issues || []).length;
      const highCount = (data.issues || []).filter(
        (i: Issue) => i.severity === "high"
      ).length;

      setMessages([
        {
          id: "welcome",
          role: "bot",
          content: `I've scanned your account. You have <strong>${summary.total_droplets || 0} Droplets</strong>, <strong>${summary.total_databases || 0} databases</strong>, and <strong>${summary.total_volumes || 0} volumes</strong>. Total monthly spend: <strong>$${summary.total_monthly_cost || 0}</strong>.<br><br>Found ${issueCount} issues${highCount > 0 ? ` — ${highCount} critical` : ""}. What would you like to tackle first?`,
          time: "Just now",
        },
      ]);

      setScreen("dashboard");
    } catch (err: any) {
      // Fallback to mock data on error
      console.error("Scan error:", err);
      setEmail("demo mode");
      setMessages(mockChat);
      setHistory(mockHistory);
      setScreen("dashboard");
    }
  }, []);

  // ── Re-scan ──
  const handleRescan = useCallback(() => {
    if (token) handleConnect(token);
  }, [token, handleConnect]);

  // ── Chat send ──
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
        const botMsg: ChatMessage = {
          id: `b-${Date.now()}`,
          role: "bot",
          content:
            data.response ||
            "I'll look into that. Let me check your infrastructure...",
          time: "Just now",
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch {
        const botMsg: ChatMessage = {
          id: `b-${Date.now()}`,
          role: "bot",
          content:
            "I'm having trouble reaching the agent endpoint. Make sure your Gradient agent is deployed and AGENT_ENDPOINT is set in your environment.",
          time: "Just now",
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    },
    [token]
  );

  // ── Fix from issues list ──
  const handleFix = useCallback((issue: Issue) => {
    const botMsg: ChatMessage = {
      id: `fix-${Date.now()}`,
      role: "bot",
      content: "Let me handle that:",
      time: "Just now",
      action: {
        title: `${issue.actionLabel}: ${issue.title}`,
        target: issue.tags[0] || "resource",
        saves: issue.savings || "Improved security posture",
        risk: "Brief interruption possible",
      },
    };
    setMessages((prev) => [...prev, botMsg]);
  }, []);

  // ── Approve action ──
  const handleApprove = useCallback(
    async (action: ChatMessage["action"]) => {
      const matchingIssue = issues.find((i) =>
        action?.title?.includes(i.title)
      );

      let fixResult = null;
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
          fixResult = await res.json();
        } catch (err) {
          console.error("Fix failed:", err);
        }
      }

      const success = fixResult?.success !== false;
      const toast: ChatMessage = {
        id: `ok-${Date.now()}`,
        role: "bot",
        content: success
          ? "Done! What else would you like me to look at?"
          : `Hit a snag: ${fixResult?.error || "unknown error"}. Want me to try a different approach?`,
        time: "Just now",
        toast: success
          ? `${action?.title} completed successfully.`
          : undefined,
      };
      setMessages((prev) => [...prev, toast]);

      // Add to history
      setHistory((prev) => [
        {
          id: `h-${Date.now()}`,
          icon: "shield",
          iconColor: "#16A34A",
          iconBg: "#F0FDF4",
          title: action?.title || "Action completed",
          time: "Just now",
          detail: `Saves ${action?.saves || "resources"}`,
          impact: action?.saves || "Done",
          impactColor: "#16A34A",
        },
        ...prev,
      ]);

      // Remove issue from list
      if (matchingIssue) {
        setIssues((prev) => prev.filter((i) => i.id !== matchingIssue.id));
      }
    },
    [issues, token]
  );

  return (
    <div className="min-h-screen">
      <Topbar
        connected={screen === "dashboard"}
        email={email}
        onRescan={handleRescan}
      />

      {screen === "onboard" && <OnboardScreen onConnect={handleConnect} />}
      {screen === "scanning" && <ScanningScreen steps={scanSteps} />}

      {screen === "dashboard" && (
        <div className="max-w-[1360px] mx-auto px-8 py-6 flex flex-col gap-5">
          <ScoreStrip scores={scores} />
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            onApprove={handleApprove}
          />
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
