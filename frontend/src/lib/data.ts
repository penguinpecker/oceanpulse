// ── Types ──

export type Severity = "high" | "medium" | "low";
export type BadgeVariant = "ok" | "warn" | "bad" | "info";

export interface HealthScores {
  overall: number;
  cost: number;
  performance: number;
  security: number;
  architecture: number;
}

export interface Issue {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  tags: string[];
  savings?: string;
  action: string;
  actionLabel: string;
  category: "cost" | "security" | "performance" | "architecture";
}

export interface Resource {
  id: string;
  name: string;
  meta: string;
  size: string;
  cpu: number;
  memory: number;
  status: string;
  statusVariant: BadgeVariant;
  cost: string;
}

export interface HistoryItem {
  id: string;
  icon: "shield" | "power" | "scan" | "resize" | "backup" | "delete";
  iconColor: string;
  iconBg: string;
  title: string;
  time: string;
  detail: string;
  impact: string;
  impactColor: string;
}

export interface ChatMessage {
  id: string;
  role: "bot" | "user";
  content: string;
  time: string;
  action?: {
    title: string;
    target: string;
    saves: string;
    risk: string;
  };
  toast?: string;
}

// ── Mock Data ──

export const mockScores: HealthScores = {
  overall: 47,
  cost: 52,
  performance: 78,
  security: 28,
  architecture: 58,
};

export const mockIssues: Issue[] = [
  {
    id: "1",
    severity: "high",
    title: "No firewall on production Droplet",
    description:
      "All ports exposed to public internet — SSH, databases, everything.",
    tags: ["web-prod-1", "s-4vcpu-8gb", "nyc1"],
    action: "create_firewall",
    actionLabel: "Fix",
    category: "security",
  },
  {
    id: "2",
    severity: "high",
    title: "GPU Droplet idle for 8 hours",
    description: "H100 at 0% utilization. Costing $4.40/hr to sit there.",
    tags: ["ml-training-1"],
    savings: "Save $35.20 now",
    action: "power_off",
    actionLabel: "Power off",
    category: "cost",
  },
  {
    id: "3",
    severity: "high",
    title: "Droplet oversized — 12% avg CPU",
    description:
      "8GB Droplet averaging 12% CPU, 23% memory. Paying for unused RAM.",
    tags: ["api-server", "$48/mo"],
    savings: "Save $24/mo → s-2vcpu-4gb",
    action: "resize",
    actionLabel: "Resize",
    category: "cost",
  },
  {
    id: "4",
    severity: "medium",
    title: "No automated backups",
    description:
      "2 Droplets unprotected. One disk failure = total data loss.",
    tags: ["web-prod-1", "api-server"],
    action: "enable_backups",
    actionLabel: "Enable",
    category: "security",
  },
  {
    id: "5",
    severity: "low",
    title: "Unused volume — 50GB unattached",
    description: "Volume not attached to any Droplet since creation.",
    tags: ["old-data-vol"],
    savings: "Save $5/mo",
    action: "delete_volume",
    actionLabel: "Delete",
    category: "cost",
  },
];

export const mockResources: Resource[] = [
  {
    id: "1",
    name: "web-prod-1",
    meta: "nyc1 · Ubuntu 24.04",
    size: "s-2vcpu-4gb",
    cpu: 45,
    memory: 62,
    status: "Active",
    statusVariant: "ok",
    cost: "$24/mo",
  },
  {
    id: "2",
    name: "api-server",
    meta: "nyc1 · Ubuntu 24.04",
    size: "s-4vcpu-8gb",
    cpu: 12,
    memory: 23,
    status: "Oversized",
    statusVariant: "warn",
    cost: "$48/mo",
  },
  {
    id: "3",
    name: "ml-training-1",
    meta: "nyc1 · GPU H100",
    size: "g-8vcpu-32gb",
    cpu: 2,
    memory: 5,
    status: "Idle 8h",
    statusVariant: "bad",
    cost: "$4.40/hr",
  },
  {
    id: "4",
    name: "staging-01",
    meta: "nyc1 · Ubuntu 22.04",
    size: "s-1vcpu-2gb",
    cpu: 34,
    memory: 55,
    status: "Active",
    statusVariant: "ok",
    cost: "$12/mo",
  },
];

export const mockHistory: HistoryItem[] = [
  {
    id: "1",
    icon: "shield",
    iconColor: "#16A34A",
    iconBg: "#F0FDF4",
    title: "Firewall created for web-prod-1",
    time: "2 min ago",
    detail: "Ports 80, 443, 22 allowed",
    impact: "Security +20",
    impactColor: "#16A34A",
  },
  {
    id: "2",
    icon: "power",
    iconColor: "#D97706",
    iconBg: "#FFFBEB",
    title: "GPU Droplet ml-training-1 powered off",
    time: "5 min ago",
    detail: "Was idle 8 hours",
    impact: "-$105/day",
    impactColor: "#16A34A",
  },
  {
    id: "3",
    icon: "scan",
    iconColor: "#1B3A5C",
    iconBg: "#EBF2FF",
    title: "Initial scan completed",
    time: "6 min ago",
    detail: "4 Droplets, 1 DB, 2 volumes",
    impact: "Baseline",
    impactColor: "#94A3B8",
  },
];

export const mockChat: ChatMessage[] = [
  {
    id: "1",
    role: "bot",
    content: `I've scanned your account. You have <strong>4 Droplets</strong>, <strong>1 database</strong>, and <strong>2 volumes</strong> in <strong>nyc1</strong>. Total monthly spend: <strong>$187</strong>.<br><br>Found 5 issues — 3 critical. Your GPU Droplet has been burning $4.40/hr for 8 hours doing nothing. Want me to shut it down?`,
    time: "Just now",
  },
  {
    id: "2",
    role: "user",
    content: "Yes power off the GPU and fix the firewall",
    time: "Just now",
  },
  {
    id: "3",
    role: "bot",
    content: "On it. Here's what I'll do:",
    time: "Just now",
    action: {
      title: "Power off GPU Droplet",
      target: "ml-training-1",
      saves: "$4.40/hr ($105/day)",
      risk: "Running jobs interrupted",
    },
  },
  {
    id: "4",
    role: "bot",
    content:
      "Now let me set up that firewall. I'll allow HTTP (80), HTTPS (443), and SSH (22) — block everything else. Sound good?",
    time: "Just now",
    toast: "GPU Droplet powered off. Saving $4.40/hr.",
  },
];

// ── Scan Steps ──

export interface ScanStep {
  label: string;
  status: "done" | "active" | "pending";
}

export const mockScanSteps: ScanStep[] = [
  { label: "Token validated", status: "done" },
  { label: "4 Droplets found", status: "done" },
  { label: "1 database found", status: "done" },
  { label: "Pulling metrics...", status: "active" },
  { label: "Checking security", status: "pending" },
  { label: "Analyzing costs", status: "pending" },
  { label: "Generating report", status: "pending" },
];
