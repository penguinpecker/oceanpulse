import { NextRequest, NextResponse } from "next/server";

const DO_API = "https://api.digitalocean.com/v2";

async function doGet(token: string, path: string) {
  const res = await fetch(`${DO_API}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`DO API ${path}: ${res.status}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { do_token } = await req.json();

    if (!do_token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Validate token
    const acctData = await doGet(do_token, "account");
    const account = acctData.account;

    // Parallel fetch all resources
    const [dropletsData, dbData, volData, fwData, snapData, balanceData] =
      await Promise.all([
        doGet(do_token, "droplets?per_page=200"),
        doGet(do_token, "databases").catch(() => ({ databases: [] })),
        doGet(do_token, "volumes?per_page=200"),
        doGet(do_token, "firewalls"),
        doGet(do_token, "snapshots?per_page=200"),
        doGet(do_token, "customers/my/balance").catch(() => ({})),
      ]);

    const droplets = (dropletsData.droplets || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      size_slug: d.size_slug,
      vcpus: d.vcpus,
      memory_mb: d.memory,
      disk_gb: d.disk,
      region: d.region?.slug,
      monthly_cost: parseFloat(d.size?.price_monthly || "0"),
      created_at: d.created_at,
      tags: d.tags,
      backup_enabled: (d.features || []).includes("backups"),
      monitoring_enabled: (d.features || []).includes("monitoring"),
      vpc_uuid: d.vpc_uuid,
    }));

    const databases = (dbData.databases || []).map((db: any) => ({
      id: db.id,
      name: db.name,
      engine: db.engine,
      size: db.size,
      region: db.region,
      status: db.status,
      num_nodes: db.num_nodes,
    }));

    const volumes = (volData.volumes || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      size_gb: v.size_gigabytes,
      region: v.region?.slug,
      attached: (v.droplet_ids || []).length > 0,
      droplet_ids: v.droplet_ids || [],
      monthly_cost: v.size_gigabytes * 0.1,
    }));

    const firewalls = (fwData.firewalls || []).map((fw: any) => ({
      id: fw.id,
      name: fw.name,
      droplet_ids: fw.droplet_ids || [],
      inbound_rules: fw.inbound_rules || [],
    }));

    const snapshots = (snapData.snapshots || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      size_gb: s.size_gigabytes,
      resource_type: s.resource_type,
      monthly_cost: s.size_gigabytes * 0.05,
    }));

    // Security analysis
    const coveredDroplets = new Set<number>();
    firewalls.forEach((fw: any) =>
      fw.droplet_ids.forEach((id: number) => coveredDroplets.add(id))
    );

    const securityIssues: any[] = [];
    droplets.forEach((d: any) => {
      if (!coveredDroplets.has(d.id)) {
        securityIssues.push({
          severity: "high",
          title: `No firewall on ${d.name}`,
          description: "All ports exposed to the public internet.",
          tags: [d.name, d.size_slug, d.region],
          action: "create_firewall",
          actionLabel: "Fix",
          category: "security",
          resource_id: d.id,
        });
      }
      if (!d.backup_enabled) {
        securityIssues.push({
          severity: "medium",
          title: `No backups on ${d.name}`,
          description: "Automated backups not enabled. Data at risk.",
          tags: [d.name],
          action: "enable_backups",
          actionLabel: "Enable",
          category: "security",
          resource_id: d.id,
        });
      }
    });

    // Cost analysis
    const costIssues: any[] = [];
    volumes
      .filter((v: any) => !v.attached)
      .forEach((v: any) => {
        costIssues.push({
          severity: "low",
          title: `Unused volume: ${v.name} (${v.size_gb}GB)`,
          description: "Volume not attached to any Droplet.",
          tags: [v.name],
          savings: `Save $${v.monthly_cost.toFixed(0)}/mo`,
          action: "delete_volume",
          actionLabel: "Delete",
          category: "cost",
          resource_id: v.id,
        });
      });

    const totalMonthly =
      droplets.reduce((s: number, d: any) => s + d.monthly_cost, 0) +
      volumes.reduce((s: number, v: any) => s + v.monthly_cost, 0) +
      snapshots.reduce((s: number, sn: any) => s + sn.monthly_cost, 0);

    const issues = [...securityIssues, ...costIssues].map((issue, i) => ({
      ...issue,
      id: String(i + 1),
    }));

    // Health scores
    const highCount = issues.filter((i) => i.severity === "high").length;
    const medCount = issues.filter((i) => i.severity === "medium").length;
    const secScore = Math.max(0, 100 - highCount * 25 - medCount * 10);
    const costScore = costIssues.length === 0 ? 85 : Math.max(30, 80 - costIssues.length * 15);
    const perfScore = 78; // need metrics agent for real data
    const archScore = droplets.every((d: any) => d.vpc_uuid) ? 75 : 55;
    const overall = Math.round((secScore + costScore + perfScore + archScore) / 4);

    // Build resources for table
    const resources = droplets.map((d: any) => ({
      id: String(d.id),
      name: d.name,
      meta: `${d.region} · ${d.size_slug}`,
      size: d.size_slug,
      cpu: 0, // need metrics API
      memory: 0,
      status: d.status === "active" ? "Active" : d.status,
      statusVariant: d.status === "active" ? "ok" : "warn",
      cost: `$${d.monthly_cost}/mo`,
    }));

    return NextResponse.json({
      account: {
        email: account.email,
        status: account.status,
        droplet_limit: account.droplet_limit,
      },
      summary: {
        total_droplets: droplets.length,
        total_databases: databases.length,
        total_volumes: volumes.length,
        total_firewalls: firewalls.length,
        total_snapshots: snapshots.length,
        total_monthly_cost: Math.round(totalMonthly * 100) / 100,
      },
      scores: {
        overall,
        cost: costScore,
        performance: perfScore,
        security: secScore,
        architecture: archScore,
      },
      issues,
      resources,
      droplets,
      volumes,
      firewalls,
      snapshots,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
